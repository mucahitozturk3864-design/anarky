#include <math.h>
#include <string.h>
#include "sequencer.h"

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#else
#define EMSCRIPTEN_KEEPALIVE
#endif

EMSCRIPTEN_KEEPALIVE
void init_step_sequencer(StepSequencer* seq, int sample_rate, float bpm) {
  if (seq == 0) return;

  seq->step_count = ANARKY_MAX_STEPS;
  seq->sample_rate = sample_rate;
  seq->bpm = bpm;

  for (int i = 0; i < ANARKY_MAX_STEPS; i++) {
    seq->steps[i].active = 0;
    seq->steps[i].velocity = 0.0f;
    seq->steps[i].frequency = 0.0f;
  }
}

EMSCRIPTEN_KEEPALIVE
void set_step(StepSequencer* seq, int index, int active, float velocity, float frequency) {
  if (seq == 0) return;
  if (index < 0 || index >= seq->step_count) return;

  if (velocity < 0.0f) velocity = 0.0f;
  if (velocity > 1.0f) velocity = 1.0f;

  seq->steps[index].active = active ? 1 : 0;
  seq->steps[index].velocity = velocity;
  seq->steps[index].frequency = frequency;
}

EMSCRIPTEN_KEEPALIVE
void render_step_sequence(StepSequencer* seq, float* buffer, int frames) {
  if (seq == 0 || buffer == 0 || frames <= 0) return;

  memset(buffer, 0, frames * sizeof(float));

  float seconds_per_beat = 60.0f / seq->bpm;
  float seconds_per_step = seconds_per_beat / 4.0f;
  int samples_per_step = (int)(seconds_per_step * seq->sample_rate);
  if (samples_per_step <= 0) samples_per_step = 1;

  for (int frame = 0; frame < frames; frame++) {
    int step_index = (frame / samples_per_step) % seq->step_count;
    BeatStep* step = &seq->steps[step_index];

    if (step->active) {
      int local_frame = frame % samples_per_step;
      float t = (float)local_frame / (float)seq->sample_rate;
      float envelope = 1.0f - ((float)local_frame / (float)samples_per_step);
      float wave = sinf(2.0f * (float)M_PI * step->frequency * t);
      buffer[frame] = wave * step->velocity * envelope;
    }
  }
}
