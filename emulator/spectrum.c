/*
 * spectrum.c — what the desk asks of a Spectrum: a 48K that runs, the frame
 * it has just finished drawing, and the tape in the recorder beside it.
 */
#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#include "deck.h"
#include "spectrum.h"
#include "ula.h"

/* The largest of 908 tape images drawn at random from those ZXDB lists for a
   48K is 317K [E]: https://github.com/zxdb/ZXDB. A sample bounds nothing, so
   the room is the CPC's, three times that. */
#define DESK_TAPE_SIZE 0x100000

static spectrum_t spectrum;
static uint8_t ram[SPECTRUM_RAM_48K];
static uint8_t rom[SPECTRUM_ROM_SIZE];
static uint8_t framebuffer[SPECTRUM_FRAMEBUFFER_WIDTH * SPECTRUM_FRAMEBUFFER_HEIGHT];
static uint8_t tape_image[DESK_TAPE_SIZE];
static deck_t deck = {
    .image = tape_image,
    .capacity = DESK_TAPE_SIZE,
    .ticks_per_millisecond = SPECTRUM_TICKS_PER_MILLISECOND,
    .machine = TZX_SPECTRUM,
};

/* The sync as of the last tick, kept between calls. The monitor holds the flag
   up for the length of the pulse and not an instant, so a frame is its rising
   edge and never its level. */
static bool retraced;

/* The recorder stands in the machine only while its head is on a tape. */
static void seat_tape(void) {
  const bool reading = deck_reading(&deck);

  spectrum_insert_tape(&spectrum, reading ? &deck.tape : NULL);
}

uint8_t *desk_spectrum_rom(void) { return rom; }

/* The beam paints only where it passes, and a tube switched on is dark where
 * it has not yet been; code 0 is black.
 *
 * spectrum_init wipes the machine's own chips and not the store the host
 * lends it, so a machine made again would wake inside the dead one's memory.
 * Zero is a choice and not a figure: a real Spectrum wakes in whatever its
 * memory held, and a machine made here is made new. */
void desk_boot_spectrum48(void) {
  memset(framebuffer, 0, sizeof framebuffer);
  memset(ram, 0, sizeof ram);
  spectrum_init(&spectrum, ram, SPECTRUM_RAM_48K, rom);
  spectrum_connect_monitor(&spectrum, framebuffer);
  retraced = false;
  seat_tape();
}

uint8_t *desk_spectrum_framebuffer(void) { return framebuffer; }

uint16_t desk_spectrum_framebuffer_width(void) { return SPECTRUM_FRAMEBUFFER_WIDTH; }

uint16_t desk_spectrum_framebuffer_height(void) { return SPECTRUM_FRAMEBUFFER_HEIGHT; }

/* The board's clock, and a frame, which on a Spectrum is an invariant. */
uint32_t desk_spectrum_ticks_per_millisecond(void) { return SPECTRUM_TICKS_PER_MILLISECOND; }

uint32_t desk_spectrum_ticks_per_frame(void) { return SPECTRUM_TICKS_PER_FRAME; }

/* As desk_cpc_run_until_retrace: the frame is whole at the moment the beam is
   parked, and a limit reached on the same tick as a retrace cannot be told
   from one that ran out. */
uint32_t desk_spectrum_run_until_retrace(uint32_t limit) {
  for (uint32_t ticks = 0; ticks < limit; ticks++) {
    /* The tape runs on past the end of what was recorded on it, and stands
       still only at a mark. */
    const bool turning = spectrum.tape != NULL && !deck_at_mark(&deck);

    if (turning) {
      deck.run++;
    }

    spectrum_tick(&spectrum);

    const bool syncing = spectrum.monitor.frame_retraced;
    const bool ended = syncing && !retraced;
    retraced = syncing;

    if (ended) {
      return ticks + 1;
    }
  }

  return limit;
}

/* One sample off the ULA, as 0xRRGGBB. */
uint32_t desk_spectrum_rgb(uint8_t sample) { return ula_rgb(sample); }

void desk_spectrum_press(uint8_t key) { keyboard_press(&spectrum.keyboard, key); }

void desk_spectrum_release(uint8_t key) { keyboard_release(&spectrum.keyboard, key); }

void desk_spectrum_release_all(void) { keyboard_release_all(&spectrum.keyboard); }

/* The matrix as the machine reads it: one byte a half-row, a set bit meaning
   released. */
uint8_t *desk_spectrum_keyboard(void) { return spectrum.keyboard.lines; }

uint8_t desk_spectrum_keyboard_lines(void) { return SPECTRUM_HALF_ROWS; }

uint8_t *desk_spectrum_tape(void) { return tape_image; }

uint32_t desk_spectrum_tape_capacity(void) { return DESK_TAPE_SIZE; }

/* A tape goes in and is wound stopped, and PLAY down sets it going again. */
static void play_if_engaged(void) {
  if (deck.engaged) {
    tape_play(&deck.tape);
  }
}

bool desk_spectrum_insert_tape(uint32_t length) {
  const bool inserted = deck_insert(&deck, length);

  play_if_engaged();
  seat_tape();
  return inserted;
}

void desk_spectrum_eject_tape(void) {
  deck.in = false;
  seat_tape();
}

/* A 48K has no relay, so PLAY alone sets the tape going. It stops where the
   image marks a stop, as an emulator stops it for the reader. */
void desk_spectrum_engage_tape(bool engaged) {
  deck.engaged = engaged;

  if (engaged) {
    tape_play(&deck.tape);
  } else {
    tape_stop(&deck.tape);
  }

  seat_tape();
}

/* Whether the tape stands at a mark with PLAY still down. */
bool desk_spectrum_tape_at_mark(void) {
  const bool reading = deck_reading(&deck);

  return reading && deck_at_mark(&deck);
}

/* Why the last tape offered was refused, or NULL when it was not. */
const char *desk_spectrum_tape_problem(void) { return deck.problem; }

double desk_spectrum_tape_position(void) { return deck_position(&deck); }

double desk_spectrum_tape_recorded(void) { return deck_recorded(&deck); }

void desk_spectrum_wind_tape(double milliseconds) {
  deck_wind(&deck, milliseconds);
  play_if_engaged();
}
