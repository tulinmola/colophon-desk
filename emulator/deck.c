/*
 * deck.c — the cassette deck, wound and read.
 */
#include <stddef.h>

#include "deck.h"

/* The next pulse along the tape, a stop the image marks passed over: the
   reader says there is none both at a mark and at its end, and only a mark
   leaves blocks behind it. */
static bool pulse_along(tzx_t *reader, tape_pulse_t *pulse) {
  while (!tzx_next_pulse(reader, pulse)) {
    const bool spent = reader->block_at >= reader->image_length;

    if (spent) {
      return false;
    }
  }

  return true;
}

bool deck_insert(deck_t *deck, uint32_t length) {
  deck->problem = NULL;
  deck->in = false;

  if (length > deck->capacity) {
    deck->problem = "the image is larger than the room a tape is given here";
    return false;
  }

  if (!tzx_open(&deck->reader, deck->image, length, deck->ticks_per_millisecond, deck->machine,
                &deck->problem)) {
    return false;
  }

  deck->length = length;
  tape_insert(&deck->tape, tzx_next_pulse, &deck->reader);
  deck->run = 0;
  deck->in = true;
  return true;
}

bool deck_reading(const deck_t *deck) { return deck->in && deck->engaged; }

bool deck_at_mark(const deck_t *deck) {
  const bool stopped = !tape_playing(&deck->tape);
  const bool behind = deck->reader.block_at < deck->reader.image_length;

  return stopped && behind;
}

double deck_position(const deck_t *deck) {
  return (double)deck->run / deck->ticks_per_millisecond;
}

double deck_recorded(const deck_t *deck) {
  tzx_t walker;
  const char *problem = NULL;
  tape_pulse_t pulse;
  uint64_t ticks = 0;

  tzx_open(&walker, deck->image, deck->length, deck->ticks_per_millisecond, deck->machine,
           &problem);

  while (pulse_along(&walker, &pulse)) {
    ticks += pulse.ticks;
  }

  return (double)ticks / deck->ticks_per_millisecond;
}

/* The reader plays forward only, so a tape wound to a place is read again
 * from its start, the pulses before the place passed over unplayed, as the
 * tape passes a head drawn back from it. The one the place falls inside is
 * held for what is left of it, as the deck would have held it.
 */
void deck_wind(deck_t *deck, double milliseconds) {
  const uint64_t to = (uint64_t)(milliseconds * deck->ticks_per_millisecond);
  const char *problem = NULL;
  tape_pulse_t pulse;
  uint64_t passed = 0;

  tzx_open(&deck->reader, deck->image, deck->length, deck->ticks_per_millisecond, deck->machine,
           &problem);
  tape_insert(&deck->tape, tzx_next_pulse, &deck->reader);

  while (passed < to) {
    const bool more = pulse_along(&deck->reader, &pulse);

    if (!more) {
      break;
    }

    const uint64_t ends = passed + pulse.ticks;
    const bool inside = ends > to;

    if (inside) {
      deck->tape.level = pulse.level;
      deck->tape.ticks_left = (uint32_t)(ends - to);
      break;
    }

    passed = ends;
  }

  deck->run = to;
}
