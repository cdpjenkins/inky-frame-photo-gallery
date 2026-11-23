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

## Results so far

Step 1's logging, on 2026-11-23 (on USB power):

| Where | Start | Start reason logged | Join | RSSI |
|---|---|---|---|---|
| usual spot | after flashing | `watchdog restart` | failed at 3000ms (status -1) | - |
| usual spot | reset | `reset (RUN pin)` | connected at 3000ms | -71 dBm |
| usual spot | cold start | `power-on` | failed at 3000ms (status -1) | - |
| usual spot | reset | `reset (RUN pin)` | failed at 3000ms (status -1) | - |
| about 3 m from the router | USB restart | `watchdog restart` | connected (IP after 4500ms) | -53 dBm |

- How the frame started does seem to matter. In the admin's wider experience at the usual spot, joins usually fail
  after a cold start or after flashing (which reboots through the watchdog), and usually succeed after a soft reset.
  The four logged starts there are too few to show it either way (3 failed, including one reset).
- A possible explanation for both: a soft reset is usually done straight after a failed join, so it acts as a quick
  second attempt, whereas a cold start or a flash makes a first attempt after a long gap. If the router tends to
  refuse a first join request but accept a quick follow-up (more likely with a weak signal), the retry in step 2
  should handle all of these.
- The router accepts or refuses the join at about 3 seconds every time, so it is a refusal, not a timeout.
- At the usual spot the signal is weak (-71 dBm, around where WiFi becomes unreliable); near the router it was
  -53 dBm (roughly 60 times stronger) and the join worked. A weak signal may contribute, but one success is not proof.
- The frame joined the router directly (BSSID `74:12:13:4d:65:4d`, matching the SSID `toob-4D654C`).
- The wake-up event is logged as `RTC alarm (6)` after every kind of start, even power-on, probably because the RTC
  timer flag set when sleeping is still set; it is not a reliable guide for now.

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

## Step 2: results

With the retry, at the usual spot:

| Start | Start reason logged | Attempts | RSSI |
|---|---|---|---|
| after flashing | `watchdog restart` | 1 refused at 3000ms; 2 connected at 3000ms | -72 dBm |
| cold starts (several, reported by the admin) | `power-on` | always 1 refused; 2 connected | - |
| soft resets (several, reported by the admin) | `reset (RUN pin)` | always 1 connected | - |

This supports the explanation above: the router refuses the first join request after a gap, and accepts a quick
follow-up, which the retry now provides within the same start. Still to check: automatic USB restarts (on USB power,
after `Sleeping for 5 minutes` the frame waits and restarts itself, logging
`Still powered (USB), so restarting for the next cycle`), which also failed before the retry.

## Step 2: what was done

`connect_wifi` now retries a refused join. On `connection failed`, it logs
`Join attempt <n> refused: connection failed (status -1) after <ms>ms`, leaves the network (`cyw43_wifi_leave`),
waits 1 second, and starts a new join, logging `Join attempt <n+1>, <ms>ms after start-up`. The 30-second limit now
covers all attempts together; if no join works within it, the log says
`Could not connect to WiFi: no join worked within 30000ms (<n> attempts)`. `network not found` and
`bad authentication` still give up at once. A successful join logs `Connected on attempt <n> after <ms>ms` (the time
within that attempt).

To check on the device (at the frame's usual spot, where most first joins were refused): over several starts, joins
that are refused on attempt 1 connect on a later attempt.

## Done when

- [ ] Step 1: the log shows the start reason, join timing, attempts and, after a join, the MAC address, BSSID and
      RSSI. Over a handful of cold starts, resets and USB restarts, the admin has recorded which ones fail.
- [ ] Step 2: cold starts and starts after new firmware connect (if on a later attempt, the log says so).
- [ ] Step 3: done if needed, or recorded as not needed.
- [ ] The stack diagnostic still shows the stack pointer above the bottom of the stack.

## Out of scope

- Reading or sharing the router's logs (the admin may look at them privately, using the frame's MAC address).
- Changing the router's settings.
