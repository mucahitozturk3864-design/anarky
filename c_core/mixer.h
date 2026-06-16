#ifndef MIXER_H
#define MIXER_H
#include "types.h"

void mix_master_output(AudioChannel* head, float* master_out, int frames);

#endif
