#include <cstring>
#include <exception>
#include <iostream>
#include <memory>
#include <string>
#include <string_view>
using namespace std;

#include "libraries/inky_frame/inky_frame.hpp"
using namespace pimoroni;

#include "JPEGDEC.h"

#include "pico/cyw43_arch.h"
#include "hardware/watchdog.h"
#include "lwip/tcp.h"
#include "lwip/apps/http_client.h"

#include "wifi_settings.h"
#include "HttpConnection.hpp"
#include "Instructions.hpp"

InkyFrame inky;

FATFS fs;

JPEGDEC jpeg;
struct {
  int x, y, w, h;
} jpeg_decode_options;

enum class ReadResult { OK, NOT_FOUND, TOO_LARGE, ERROR };

ReadResult read_text_file(const char *file_path, string_view &contents);
HttpResult http_get_to_file(const char *ip_addres, int port, const char *path, const char *file_path);
void filesystem_list(const char *path);
bool mount_sd_card_filesystem();
bool connect_wifi();
uint32_t read_n();
void run_cycle();
void sleep_until_next_cycle();
void paint_stack();
void report_stack_usage(const char *where);

// Story 0016. The frame runs one cycle each time it wakes up: connect, fetch the instructions after N, log them, then
// sleep for MINUTES_BETWEEN_CYCLES.
constexpr int MINUTES_BETWEEN_CYCLES = 5;

// N, the sequence number of the last instruction the frame consumed, as a decimal number. No file means 0. (Story
// 0016 only reads it; story 0013 will update it.)
const char *N_FILE_PATH = "/last_instruction.txt";

// Where the /instructions response is downloaded to, before it is read.
const char *INSTRUCTIONS_FILE_PATH = "/instructions.txt";

// The largest text file read_text_file can read (its buffer is static: story 0018).
constexpr FSIZE_t TEXT_FILE_MAX_SIZE = (1 << 14) - 1;

// The Inky Frame's power-hold pin (InkyFrame::HOLD_VSYS_EN, which is not public).
constexpr uint HOLD_VSYS_EN_PIN = 2;

void *jpegdec_open_callback(const char *filename, int32_t *size) {
    FIL *fil = new FIL;
    if (f_open(fil, filename, FA_READ)) { return nullptr; }
    *size = f_size(fil);

    cout << "opened file; size: " << *size << endl;

    return (void *)fil;
}

void jpegdec_close_callback(void *handle) {
  f_close((FIL *)handle);
  delete (FIL *)handle;
}

int32_t jpegdec_read_callback(JPEGFILE *jpeg, uint8_t *p, int32_t c) {
    uint br;
    f_read((FIL *)jpeg->fHandle, p, c, &br);

    return br;
}

int32_t jpegdec_seek_callback(JPEGFILE *jpeg, int32_t p) {
    return f_lseek((FIL *)jpeg->fHandle, p) == FR_OK ? 1 : 0;
}

int jpegdec_draw_callback(JPEGDRAW *draw) {
  uint16_t *p = draw->pPixels;

  int xo = jpeg_decode_options.x;
  int yo = jpeg_decode_options.y;

  for(int y = 0; y < draw->iHeight; y++) {
    for(int x = 0; x < draw->iWidth; x++) {
      int sx = ((draw->x + x + xo) * jpeg_decode_options.w) / jpeg.getWidth();
      int sy = ((draw->y + y + yo) * jpeg_decode_options.h) / jpeg.getHeight();

      if(xo + sx > 0 && xo + sx < inky.bounds.w && yo + sy > 0 && yo + sy < inky.bounds.h) {
        inky.set_pixel_dither({xo + sx, yo + sy}, RGB(RGB565(*p)));
      }

      p++;
    }
  }

  return 1; // continue drawing
}

void draw_jpeg(std::string filename, int x, int y, int w, int h) {
    // TODO: this is a horrible way to do it but we need to pass some parameters
    // into the jpegdec_draw_callback() method somehow and the library isn't
    // setup to allow any sort of user data to be passed around - yuck
    jpeg_decode_options.x = x;
    jpeg_decode_options.y = y;
    jpeg_decode_options.w = w;
    jpeg_decode_options.h = h;

    jpeg.open(
        filename.c_str(),
        jpegdec_open_callback,
        jpegdec_close_callback,
        jpegdec_read_callback,
        jpegdec_seek_callback,
        jpegdec_draw_callback);

    jpeg_decode_options.w = jpeg.getWidth();
    jpeg_decode_options.h = jpeg.getHeight();

    jpeg.setPixelType(RGB565_BIG_ENDIAN);

    cout << "Starting jpeg decode.." << endl;
    int start = millis();
    jpeg.decode(0, 0, 0);
    cout << "done in " << int(millis() - start) << " ms!" << endl;

    jpeg.close();
}



int main() {
    paint_stack();

    inky.init();

    stdio_init_all();
    sleep_ms(2000);

    cout << "*****************************" << endl;
    cout << "Welcome to the Photo Gallery!" << endl;
    cout << "*****************************" << endl << endl << endl;

    // Errors are returned, not thrown (story 0016). This catch is only a safety net, so that the frame still sleeps
    // and tries again if a library throws.
    try {
        run_cycle();
    } catch (exception &e) {
        cout << "Unexpected exception: " << e.what() << endl;
    }

    report_stack_usage("at the end of the cycle");
    sleep_until_next_cycle();
}

// Story 0016: one cycle. Every failure is logged, and the frame then sleeps and tries again in the next cycle.
void run_cycle() {
    if (!mount_sd_card_filesystem()) {
        return;
    }

    if (!connect_wifi()) {
        return;
    }

    uint32_t n = read_n();

    char path[PATH_MAX_LENGTH];
    if (!format_instructions_path(n, path, sizeof path)) {
        cout << "Could not make the path for N = " << n << endl;
        return;
    }

    inky.led(pimoroni::InkyFrame::LED_CONNECTION, 100);
    HttpResult result = http_get_to_file(SERVER_ADDRESS, SERVER_PORT, path, INSTRUCTIONS_FILE_PATH);
    inky.led(pimoroni::InkyFrame::LED_CONNECTION, 0);

    if (result.outcome == HttpResult::UNREACHABLE) {
        cout << "Could not reach the backend" << endl;
        return;
    }
    if (result.outcome == HttpResult::FILE_ERROR) {
        cout << "Could not save the instructions to " << INSTRUCTIONS_FILE_PATH << endl;
        return;
    }
    if (result.status != 200) {
        cout << "Could not fetch instructions (" << result.status << ")" << endl;
        return;
    }

    string_view response;
    switch (read_text_file(INSTRUCTIONS_FILE_PATH, response)) {
        case ReadResult::OK:
            break;
        case ReadResult::TOO_LARGE:
            // Responses too big for the buffer are out of scope for story 0016 (see story 0002).
            cout << "Could not read the instructions: the response is larger than " << TEXT_FILE_MAX_SIZE
                 << " bytes" << endl;
            return;
        default:
            cout << "Could not read the instructions from " << INSTRUCTIONS_FILE_PATH << endl;
            return;
    }

    for_each_instruction(response, [](const Instruction &instruction) {
        cout << "Received instruction " << instruction.sequence_number << ": " << instruction.text << endl;
    });
}

// Story 0016, Rule 2: N comes from N_FILE_PATH on the SD card; no file means 0.
uint32_t read_n() {
    string_view contents;
    switch (read_text_file(N_FILE_PATH, contents)) {
        case ReadResult::NOT_FOUND:
            cout << "No " << N_FILE_PATH << ", so N is 0" << endl;
            return 0;
        case ReadResult::OK:
            if (optional<uint32_t> n = parse_sequence_number(contents)) {
                cout << "N is " << *n << endl;
                return *n;
            }
            cout << N_FILE_PATH << " does not hold a sequence number, so N is 0" << endl;
            return 0;
        default:
            cout << "Could not read " << N_FILE_PATH << ", so N is 0" << endl;
            return 0;
    }
}

// Story 0016, Rule 1: sleep for MINUTES_BETWEEN_CYCLES, then start the next cycle from scratch.
//
// This does what inky.sleep(MINUTES_BETWEEN_CYCLES) does: set the RTC to wake the frame, then release the power-hold
// pin. On battery, the power goes off at that point, and the RTC powers the frame on again later, which runs main()
// from the start. But inky.sleep() then loops forever, so on USB power (where the power cannot go off) the frame would
// never run another cycle. So instead, if the frame is still running, wait, then reboot: also a fresh start.
void sleep_until_next_cycle() {
    cout << "Sleeping for " << MINUTES_BETWEEN_CYCLES << " minutes" << endl;

    inky.rtc.set_timer(MINUTES_BETWEEN_CYCLES, PCF85063A::TIMER_TICK_1_OVER_60HZ);
    inky.rtc.enable_timer_interrupt(true, false);
    gpio_put(HOLD_VSYS_EN_PIN, false);

    // Still running: on USB power.
    sleep_ms(MINUTES_BETWEEN_CYCLES * 60 * 1000);
    cout << "Still powered (USB), so restarting for the next cycle" << endl;
    watchdog_reboot(0, 0, 0);
    while (true) {}
}

// Story 0016, Rule 4: if WiFi fails to connect, the error is logged and false is returned.
bool connect_wifi() {
    int rc;

    cout << "Setting up WiFI" << endl;
    cout << "Initialising CYW43... ";
    rc = cyw43_arch_init_with_country(CYW43_COUNTRY_UK);
    if (rc) {
        cout << "Return code: " << rc << endl;
        cout << "Could not connect to WiFi: failed to initialise CYW43" << endl;
        return false;
    }
    cout << "Initialising CYW43 done." << endl;

    cyw43_arch_enable_sta_mode();

    cout << "Connecting to WiFi (SSID: " << WIFI_SSID << ")... " << endl;

    const int CONNECT_TIMEOUT_MS = 30000;
    const int CHECK_INTERVAL_MS = 500;
    int elapsed_ms = 0;

    rc = cyw43_arch_wifi_connect_async(WIFI_SSID, WIFI_PASSWORD, CYW43_AUTH_WPA2_MIXED_PSK);
    if (rc) {
        cout << "Could not connect to WiFi: failed to start the connection, return code: " << rc << endl;
        return false;
    }

    while (elapsed_ms < CONNECT_TIMEOUT_MS) {
        int status = cyw43_tcpip_link_status(&cyw43_state, CYW43_ITF_STA);

        cout << "Status after " << elapsed_ms << "ms: ";
        switch(status) {
            case CYW43_LINK_DOWN:
                cout << "link down" << endl;
                break;
            case CYW43_LINK_JOIN:
                cout << "joining" << endl;
                break;
            case CYW43_LINK_NOIP:
                cout << "connected, waiting for IP" << endl;
                break;
            case CYW43_LINK_UP:
                cout << "connected with IP!" << endl;
                goto connected;
            case CYW43_LINK_FAIL:
                cout << "connection failed" << endl;
                cout << "Could not connect to WiFi: connection failed" << endl;
                return false;
            case CYW43_LINK_NONET:
                cout << "network not found" << endl;
                cout << "Could not connect to WiFi: network not found" << endl;
                return false;
            case CYW43_LINK_BADAUTH:
                cout << "bad authentication" << endl;
                cout << "Could not connect to WiFi: bad authentication" << endl;
                return false;
            default:
                cout << "unknown (" << status << ")" << endl;
        }

        sleep_ms(CHECK_INTERVAL_MS);
        elapsed_ms += CHECK_INTERVAL_MS;
    }

    cout << "Could not connect to WiFi: timed out after " << CONNECT_TIMEOUT_MS << "ms" << endl;
    return false;

connected:
    cout << "IP address: " << ip4addr_ntoa(netif_ip_addr4(netif_default)) << endl;
    cout << "Netmask:    " << ip4addr_ntoa(netif_ip_netmask4(netif_default)) << endl;
    cout << "Gateway:    " << ip4addr_ntoa(netif_ip_gw4(netif_default)) << endl;
    cout << "Hostname:   " << netif_get_hostname(netif_default) << endl;
    return true;
}

bool mount_sd_card_filesystem() {
    cout << "Mounting SD card filesystem... ";
    FRESULT fr = f_mount(&fs, "", 1);
    if (fr != FR_OK) {
        cout << "fr: " << fr << endl;
        cout << "Could not mount the SD card" << endl;
        return false;
    }
    cout << "Filesystem mounted!" << endl;
    return true;
}

void filesystem_list(const char *path) {
    cout << "Listing sd card contents.." << endl;
    FILINFO file;
    auto dir = new DIR();
    f_opendir(dir, path);
    while(f_readdir(dir, &file) == FR_OK && file.fname[0]) {
        cout << file.fname << " " << file.fsize << endl;
    }
    f_closedir(dir);
    cout << "Listing done!" << endl;
}

HttpResult http_get_to_file(const char *ip_addres, int port, const char *path, const char *file_path) {
    cout << "Downloading " << path << " to " << file_path << "... ";
    // On the heap, not the stack: an HttpConnection holds an open FatFs FIL (about 600 bytes in all), and lwIP and the
    // WiFi driver make deep calls below this frame, so on the 2 KB stack it left too little room (story 0016).
    unique_ptr<HttpConnection> connection(new HttpConnection(ip_addres, port, path, file_path));
    return connection->do_request();
}

// Reads a whole text file into a static buffer, and points `contents` at it. `contents` stays valid until the next
// call. No exceptions (story 0016): the result says what went wrong.
ReadResult read_text_file(const char *file_path, string_view &contents) {

    cout << "Reading " << file_path << "... ";

    // Story 0018: static, not a local variable. Core 0's stack is only 2 KB, so a 16 KB local buffer here ran far past
    // the end of the stack, silently overwriting other memory (including the top of the heap).
    static char buffer[TEXT_FILE_MAX_SIZE + 1];

    // Static too, to keep the stack small (story 0016): a FatFs FIL is about 560 bytes.
    static FIL file_handle;
    FRESULT rc = f_open(&file_handle, file_path, FA_OPEN_EXISTING | FA_READ);
    if (rc == FR_NO_FILE || rc == FR_NO_PATH) {
        cout << "not found" << endl;
        return ReadResult::NOT_FOUND;
    }
    if (rc) {
        cout << "rc: " << rc << endl;
        return ReadResult::ERROR;
    }

    FSIZE_t file_size = f_size(&file_handle);
    cout << "size " << file_size << " bytes" << endl;
    if (file_size > TEXT_FILE_MAX_SIZE) {
        f_close(&file_handle);
        return ReadResult::TOO_LARGE;
    }

    UINT bytes_read;
    FRESULT fresult = f_read(&file_handle, buffer, file_size, &bytes_read);
    f_close(&file_handle);
    if (fresult != FR_OK) {
        cout << "Failed to read from " << file_path << ": " << fresult << endl;
        return ReadResult::ERROR;
    }
    buffer[bytes_read] = '\0';

    report_stack_usage("inside read_text_file");

    contents = string_view(buffer, bytes_read);
    return ReadResult::OK;
}

// Story 0018: measuring core 0's stack. The stack runs from __StackTop down to __StackBottom (2 KB; both are defined
// by the Pico SDK's linker script).
//
// - paint_stack(), called once at start-up, fills the unused part of the stack with a known pattern.
// - report_stack_usage() prints (a) how deep the stack has ever reached, from how much of the pattern has been
//   overwritten, and (b) where the stack pointer is now. (b) is what shows an overflow: a large local variable puts
//   the stack pointer below __StackBottom, where (a) cannot see it, because the overflowing data is written below the
//   painted area rather than into it.
extern "C" uint32_t __StackBottom;
extern "C" uint32_t __StackTop;

const uint32_t STACK_PAINT = 0xDEADBEEF;

void paint_stack() {
    uint32_t marker;                        // lives in this function's frame, near the current stack pointer
    uint32_t *limit = &marker - 16;         // leave a margin below this frame unpainted
    for (uint32_t *p = &__StackBottom; p < limit; p++) {
        *p = STACK_PAINT;
    }
}

void report_stack_usage(const char *where) {
    const char *top = (const char *) &__StackTop;
    const char *bottom = (const char *) &__StackBottom;

    const uint32_t *p = &__StackBottom;
    while (p < &__StackTop && *p == STACK_PAINT) {
        p++;
    }
    int deepest = top - (const char *) p;

    uint32_t marker;                        // its address is close to the current stack pointer
    const char *sp = (const char *) &marker;

    cout << "Stack " << where << ": deepest use " << deepest << " of " << (top - bottom) << " bytes; ";
    if (sp >= bottom) {
        cout << "stack pointer is " << (sp - bottom) << " bytes above the bottom of the stack" << endl;
    } else {
        cout << "OVERFLOW: stack pointer is " << (bottom - sp) << " bytes BELOW the bottom of the stack" << endl;
    }
}
