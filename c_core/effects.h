#ifndef EFFECTS_H
#define EFFECTS_H
#include "types.h"

void apply_distortion_effect(float* buffer, int frames, float drive);
void apply_robot_voice(float* buffer, int frames);
void apply_vocal_effect(AudioChannel* ch, VocalEffect* fx, int frames);

#endif
