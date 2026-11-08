/*
 * deck.h — the cassette deck a machine on the desk reads its tapes from: the
 * image a reader offered, the reel it is wound on and how far it has run. What
 * turns the reel is the machine's to say — a CPC's relay, or on a Spectrum,
 * which has none, PLAY alone.
 */
#ifndef DESK_DECK_H
#define DESK_DECK_H

#include <stdbool.h>
#include <stdint.h>

#include "tape.h"
#include "tzx.h"

typedef struct {
  /* The image is borrowed where it lies, and is written over only on the way
     into deck_insert, with no tick run in between. */
  uint8_t *image;
  uint32_t capacity;
  uint32_t length;
  uint32_t ticks_per_millisecond;
  tzx_machine machine;

  tzx_t reader;
  tape_t tape;
  const char *problem;
  bool in;

  /* PLAY down: the head is on the tape. With PLAY up it is drawn back and
     reads nothing, which is what the machine makes of an empty deck. */
  bool engaged;

  /* How far the tape has run past the head since its start, in the board's
     ticks. A tape runs on past the end of what was recorded on it. */
  uint64_t run;
} deck_t;

/* A tape comes in wound to its start, the old one out first, so a refusal
   leaves the deck empty. */
bool deck_insert(deck_t *deck, uint32_t length);

/* Whether the head is on a tape, which is when the deck stands in the
   machine. */
bool deck_reading(const deck_t *deck);

/* Whether the tape stands still with more recorded behind it: on a Spectrum,
   whose PLAY alone runs it, that is where the image marks a stop. */
bool deck_at_mark(const deck_t *deck);

double deck_position(const deck_t *deck);

/* How long what is recorded on the tape plays, read through once, its marks
   passed over. */
double deck_recorded(const deck_t *deck);

/* The tape wound to a place along it, its marks passed over, and stopped
   there. */
void deck_wind(deck_t *deck, double milliseconds);

#endif
