#ifndef INKY_FRAME_PHOTO_GALLERY_CPP_HTTPCONNECTION_HPP
#define INKY_FRAME_PHOTO_GALLERY_CPP_HTTPCONNECTION_HPP

#include <string>
#include <vector>

const size_t IP_V4_MAX_LENGTH = 20;     // longer than needed but meh
const size_t PATH_MAX_LENGTH = 128;

// The outcome of an HTTP GET (story 0016).
struct HttpResult {
    enum Outcome {
        COMPLETED,          // the server answered; `status` is its HTTP status code
        UNREACHABLE,        // the server could not be reached, or did not answer in time
        FILE_ERROR          // the file to download into could not be opened
    };
    Outcome outcome;
    uint32_t status;        // the HTTP status code, when the outcome is COMPLETED
};

class HttpConnection {

public:
    HttpConnection(const char *ip_address_param,
                   int port,
                   const char *path,
                   const char *filename);

    virtual ~HttpConnection();

    void http_result_received(httpc_result_t httpc_result, u32_t rx_content_len, u32_t srv_res, err_t err);
    err_t http_headers_received(httpc_state_t *connection, pbuf *hdr, u16_t hdr_len, u32_t content_len);
    err_t http_body_received(tcp_pcb *conn, pbuf *p, err_t err);
    // Sends the GET and waits until it has finished. The body is written to the file named in the constructor.
    HttpResult do_request();

private:
    char *ip_address;
    int port;
    char *path;
    FIL file_handle;
    char *filename;
    int bytes_downloaded = 0;

    bool file_open = false;

    // Not sure if volatile is enough or if there are more powerful synchronisation primatives that need to be used here
    volatile bool completed = false;
    volatile httpc_result_t result = HTTPC_RESULT_ERR_UNKNOWN;
    volatile uint32_t status = 0;
};

void http_result_callback(void *arg,
                          httpc_result_t httpc_result,
                          u32_t rx_content_len,
                          u32_t srv_res,
                          err_t err
);

err_t http_headers_callback(httpc_state_t *connection,
                            void *arg,
                            struct pbuf *hdr,
                            u16_t hdr_len,
                            u32_t content_len
);

err_t http_body_callback(void *arg,
                         struct altcp_pcb *conn,
                         struct pbuf *p,
                         err_t err);

#endif //INKY_FRAME_PHOTO_GALLERY_CPP_HTTPCONNECTION_HPP
