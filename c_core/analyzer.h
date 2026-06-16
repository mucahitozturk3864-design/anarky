#ifndef ANALYZER_H
#define ANALYZER_H

#include "types.h"

AudioStats analyze_buffer(const float* buffer, int frames);
void print_audio_stats(const char* label, AudioStats stats);

#endif
