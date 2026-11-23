# Story: The frame connects to WiFi reliably

Status: Scoped (an investigation and fix on the device, not example-mapped or test-driven).

Found while checking [story 0013](../doing/0013-frame-carries-out-show.md) on the device.

## Story

As an admin,
I want the Inky Frame to connect to WiFi every time it wakes up,
so that it does not miss its chance to fetch instructions in a cycle.

## What has been seen

- The frame often fails to join WiFi, with `Could not connect to WiFi: connection failed`, about 3 seconds into the
  join. It then sleeps for 5 minutes, so that cycle is lost.
- It usually fails on the first start after loading new firmware, and after a cold start (powering it on). A reset
  straight afterwards usually connects. It has not yet been run on battery.
- `connection failed` is the WiFi driver's `CYW43_LINK_FAIL`: the router refused the join for a reason other than "no
  network found" or "wrong password" (a `CYW43_EV_SET_SSID` event with a failure status). The driver power-cycles the
  WiFi chip at every start (`cyw43_spi_reset`), so stale state in the chip is unlikely.

Possible causes, most likely first: the first join after power-on is refused but a retry would work; `connect_wifi`
gives up at the first refusal instead of retrying within its 30 seconds; radio conditions (a weak signal, a busy
2.4 GHz channel); the router's security mode (the frame asks for WPA2).

The router's own logs could say why it refused the join, but they contain personal information (other devices' names
and MAC addresses, the public IP address, account details), so they are not to be pasted into this conversation. The
frame's MAC address (logged in step 1) lets the admin find only the frame's lines.

## Scope

Each step is done, then checked on the device, before the next.

1. **Logging** (no change in behaviour):
   - why the frame started: power-on, the reset button (RUN pin), or a watchdog restart (the USB-power restart of
     story 0016), from the RP2040's reset reason and `watchdog_caused_reboot()`; and the Inky Frame's wake-up event
     (`inky.get_wake_up_event()`)
   - the time since start-up when the join begins
   - the attempt number, and the final status of each join as a number as well as words
   - after a successful join: the frame's WiFi MAC address, the access point's BSSID, and the signal strength (RSSI)
   - Later, only if needed: the WiFi driver's raw join events (the router's status and reason codes), once it is clear
     how to turn them on in this SDK version.
2. **Retry the join**: on `connection failed`, try again, within the existing 30-second limit, logging each attempt.
3. **Disconnect cleanly** (only if failures continue after step 2): leave the network (`cyw43_wifi_leave`) and stop
   the driver (`cyw43_arch_deinit`) before sleeping or restarting.

## Done when

- [ ] Step 1: the log shows the start reason, join timing, attempts and, after a join, the MAC address, BSSID and
      RSSI. Over a handful of cold starts, resets and USB restarts, the admin has recorded which ones fail.
- [ ] Step 2: cold starts and starts after new firmware connect (if on a later attempt, the log says so).
- [ ] Step 3: done if needed, or recorded as not needed.
- [ ] The stack diagnostic still shows the stack pointer above the bottom of the stack.

## Out of scope

- Reading or sharing the router's logs (the admin may look at them privately, using the frame's MAC address).
- Changing the router's settings.
