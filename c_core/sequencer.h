#ifndef SEQUENCER_H
#define SEQUENCER_H

#include "types.h"

#define ANARKY_MAX_STEPS 16

typedef struct {
  BeatStep steps[ANARKY_MAX_STEPS];
  int step_count;
  int sample_rate;
  float bpm;
} StepSequencer;

void init_step_sequencer(StepSequencer* seq, int sample_rate, float bpm);
void set_step(StepSequencer* seq, int index, int active, float velocity, float frequency);
void render_step_sequence(StepSequencer* seq, float* buffer, int frames);

#endif
