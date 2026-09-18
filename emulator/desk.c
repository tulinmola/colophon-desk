/*
 * desk.c — what the desk asks of a machine: a 6128 that runs, and the frame
 * it has just finished drawing.
 */
#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#include "cpc.h"
#include "gate_array.h"

/* A 6128's 128K, and the 32K image holding its operating system and BASIC
   beside the 16K AMSDOS that comes with the disc interface. */
#define DESK_RAM_SIZE 0x20000
#define DESK_ROM_SIZE 0x8000
#define DESK_BASIC_AT 0x4000
#define DESK_AMSDOS_SIZE 0x4000

static cpc_t cpc;
static uint8_t ram[DESK_RAM_SIZE];
static uint8_t rom[DESK_ROM_SIZE];
static uint8_t amsdos[DESK_AMSDOS_SIZE];
static uint8_t framebuffer[CPC_FRAMEBUFFER_WIDTH * CPC_FRAMEBUFFER_HEIGHT];

/* The sync as of the last tick, kept between calls. The monitor holds the flag
   up for the length of the pulse and not an instant, so a frame is its rising
   edge and never its level. */
static bool retraced;

uint8_t *desk_rom(void) { return rom; }

uint8_t *desk_amsdos(void) { return amsdos; }

/* The operating system is the image's first half and BASIC its second, which
 * goes in as upper ROM 0; the disc interface a 6128 has soldered in brings
 * AMSDOS as upper ROM 7.
 *
 * With no monitor plugged in the machine runs on and draws into the void, so
 * the framebuffer is never written and no frame ever ends.
 *
 * The beam paints only where it passes, and a tube switched on is dark where
 * it has not yet been, so the frame starts black rather than at colour code
 * zero, which is a grey-green. */
void desk_boot_cpc6128(void) {
  memset(framebuffer, GATE_ARRAY_BLACK, sizeof framebuffer);
  cpc_init(&cpc, ram, DESK_RAM_SIZE, rom);
  cpc_set_upper_rom(&cpc, 0, rom + DESK_BASIC_AT);
  cpc_fit_disc_interface(&cpc, true);
  cpc_set_upper_rom(&cpc, 7, amsdos);
  cpc_connect_monitor(&cpc, framebuffer);
  retraced = false;
}

uint8_t *desk_framebuffer(void) { return framebuffer; }

uint16_t desk_framebuffer_width(void) { return CPC_FRAMEBUFFER_WIDTH; }

uint16_t desk_framebuffer_height(void) { return CPC_FRAMEBUFFER_HEIGHT; }

/* The board's clock, and the frame the firmware programs. The second is a
   convention and not an invariant — the CRTC's frame is whatever its
   registers say — which is why it is only ever the slack a caller adds to a
   limit, and never a promise about when a frame ends. */
uint32_t desk_ticks_per_millisecond(void) { return CPC_TICKS_PER_MILLISECOND; }

uint32_t desk_ticks_per_frame(void) { return CPC_TICKS_PER_STANDARD_FRAME; }

/* The frame is whole in the framebuffer at the moment the beam is parked,
 * and the rest of the sync then paints over its first lines, so a caller
 * reads the picture here and not later. A limit reached on the same tick as
 * a retrace cannot be told from one that ran out, which is why callers give
 * a frame of slack rather than asking for exactly one. */
uint32_t desk_run_until_retrace(uint32_t limit) {
  for (uint32_t ticks = 0; ticks < limit; ticks++) {
    cpc_tick(&cpc);

    const bool syncing = cpc.monitor.frame_retraced;
    const bool ended = syncing && !retraced;

    retraced = syncing;

    if (ended) {
      return ticks + 1;
    }
  }

  return limit;
}

/* One sample off the cable, as 0xRRGGBB: the hardware colour code the Gate
   Array puts on it, decoded as the monitor decodes it. */
uint32_t desk_rgb(uint8_t colour_code) { return gate_array_rgb(colour_code); }

void desk_press(uint8_t key) { keyboard_press(&cpc.keyboard, key); }

void desk_release(uint8_t key) { keyboard_release(&cpc.keyboard, key); }

void desk_release_all(void) { keyboard_release_all(&cpc.keyboard); }

/* The matrix as the machine reads it: one byte a line, a set bit meaning
   released. */
uint8_t *desk_keyboard(void) { return cpc.keyboard.lines; }

uint8_t desk_keyboard_lines(void) { return CPC_KEYBOARD_LINES; }
