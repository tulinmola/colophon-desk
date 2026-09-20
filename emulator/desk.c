/*
 * desk.c — what the desk asks of a machine: a 6128 that runs, the frame it
 * has just finished drawing, and the disc in its drive.
 */
#include <stdbool.h>
#include <stdint.h>
#include <string.h>

#include "cpc.h"
#include "dsk.h"
#include "floppy.h"
#include "gate_array.h"

/* A 6128's 128K, and the 32K image holding its operating system and BASIC
   beside the 16K AMSDOS that comes with the disc interface. */
#define DESK_RAM_SIZE 0x20000
#define DESK_ROM_SIZE 0x8000
#define DESK_BASIC_AT 0x4000
#define DESK_AMSDOS_SIZE 0x4000

/* The 6128's own drive is A, the one the core numbers 0. */
#define DESK_DRIVE 0

/* A CPC's own discs are a fifth of this. The rest is for the extended images
   of protected ones, which store every reading of an unstable sector. */
#define DESK_DISC_SIZE 0x100000

static cpc_t cpc;
static uint8_t ram[DESK_RAM_SIZE];
static uint8_t rom[DESK_ROM_SIZE];
static uint8_t amsdos[DESK_AMSDOS_SIZE];
static uint8_t framebuffer[CPC_FRAMEBUFFER_WIDTH * CPC_FRAMEBUFFER_HEIGHT];

/* A floppy borrows its image where it lies, so this buffer is the disc while
   it is in the drive and where its writes land. A new image is written over it
   only on the way into desk_insert_disc, which takes the old disc out before
   reading the new, and the machine runs no tick in between. */
static uint8_t disc_image[DESK_DISC_SIZE];
static floppy_t disc;
static const char *disc_problem;

/* Whether the drive holds one, which a machine made again has to be told: a
   disc left in a drive is still in it when the power comes back. */
static bool disc_in;

/* The lamp's line as the cycles ran, held until it is read: a lens dark for a
   frame between one command and the next would blink where the machine's does
   not. */
static bool drive_worked;

/* What the drive's own bezel calls its IN USE lamp. The user manual has it show
 * "data being read from, or written to the disc", and says a second drive's
 * "will illuminate constantly. It will extinguish when the main disc drive
 * within the computer (Drive A) is reading or writing to disc" [A]:
 * https://archive.org/details/amstrad-cpc-6128-user-manual — the behaviour of a
 * select line the two drives share inverted, and not of the motor, which the
 * machine leaves running and which turns both drives at once.
 *
 * A drive is selected by the command that names it, so the lamp answers a try
 * as well as a reading: a command that finds no disc names the drive, fails,
 * and goes straight to its result phase without ever executing. A seek and a
 * recalibrate the chip hands back at once and steps on its own time, so a
 * stepping head stands beside the two phases here. */
static bool drive_at_work(void) {
  const upd765_unit_t *unit = &cpc.fdc.units[DESK_DRIVE];
  const bool executing = cpc.fdc.phase == UPD765_PHASE_EXECUTION;
  const bool reporting = cpc.fdc.phase == UPD765_PHASE_RESULT;
  const bool ours = cpc.fdc.unit == DESK_DRIVE;
  const bool answering = (executing || reporting) && ours;

  return answering || unit->seeking;
}

/* The sync as of the last tick, kept between calls. The monitor holds the flag
   up for the length of the pulse and not an instant, so a frame is its rising
   edge and never its level. */
static bool retraced;

uint8_t *desk_rom(void) { return rom; }

uint8_t *desk_amsdos(void) { return amsdos; }

/* The beam paints only where it passes, and a tube switched on is dark where it
 * has not yet been, so a frame starts black rather than at colour code zero,
 * which is a grey-green. */
void desk_blank_picture(void) { memset(framebuffer, GATE_ARRAY_BLACK, sizeof framebuffer); }

/* The operating system is the image's first half and BASIC its second, which
 * goes in as upper ROM 0; the disc interface a 6128 has soldered in brings
 * AMSDOS as upper ROM 7.
 *
 * With no monitor plugged in the machine runs on and draws into the void, so
 * the framebuffer is never written and no frame ever ends.
 */
void desk_boot_cpc6128(void) {
  desk_blank_picture();
  /* cpc_init wipes the machine's own chips and not the store the host lends
     it, so a machine made again would wake inside the dead one's memory. Zero
     is a choice and not a figure: a real 6128 wakes in whatever its memory
     held, and a machine made here is made new. */
  memset(ram, 0, sizeof ram);
  cpc_init(&cpc, ram, DESK_RAM_SIZE, rom);
  cpc_set_upper_rom(&cpc, 0, rom + DESK_BASIC_AT);
  cpc_fit_disc_interface(&cpc, true);
  cpc_set_upper_rom(&cpc, 7, amsdos);
  cpc_connect_monitor(&cpc, framebuffer);

  /* cpc_init clears the drive as it clears everything else, so the disc goes
     back in behind it. */
  if (disc_in) {
    cpc_insert_disc(&cpc, DESK_DRIVE, &disc);
  }

  retraced = false;
  drive_worked = false;
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
    drive_worked = drive_worked || drive_at_work();

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

uint8_t *desk_disc(void) { return disc_image; }

uint32_t desk_disc_capacity(void) { return DESK_DISC_SIZE; }

/* The old disc comes out first, as a hand takes it out before offering the
 * drive another, so a refusal of any kind leaves the drive empty; and dsk_read
 * empties the floppy it refuses, which left mounted would be a medium with
 * nothing on it rather than an empty drive. */
bool desk_insert_disc(uint32_t length) {
  disc_problem = NULL;
  disc_in = false;
  cpc_insert_disc(&cpc, DESK_DRIVE, NULL);

  if (length > DESK_DISC_SIZE) {
    disc_problem = "the image is larger than the room a disc is given here";
    return false;
  }

  if (!dsk_read(&disc, disc_image, length, &disc_problem)) {
    return false;
  }

  cpc_insert_disc(&cpc, DESK_DRIVE, &disc);
  disc_in = true;
  return true;
}

void desk_eject_disc(void) {
  disc_in = false;
  cpc_insert_disc(&cpc, DESK_DRIVE, NULL);
}

bool desk_drive_in_use(void) {
  const bool worked = drive_worked;

  drive_worked = false;

  return worked;
}

/* Why the last disc offered was refused, or NULL when it was not. */
const char *desk_disc_problem(void) { return disc_problem; }
