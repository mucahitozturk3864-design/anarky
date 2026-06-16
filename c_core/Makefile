CC = gcc
CFLAGS = -Wall -Wextra -O2

OBJS = main.o channel.o effects.o mixer.o wav_writer.o album_bst.o filters.o
TARGET = anarky_daw_core

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS)

main.o: main.c types.h channel.h effects.h mixer.h wav_writer.h album_bst.h filters.h
	$(CC) $(CFLAGS) -c main.c

channel.o: channel.c channel.h types.h
	$(CC) $(CFLAGS) -c channel.c

effects.o: effects.c effects.h types.h
	$(CC) $(CFLAGS) -c effects.c

mixer.o: mixer.c mixer.h types.h
	$(CC) $(CFLAGS) -c mixer.c

wav_writer.o: wav_writer.c wav_writer.h
	$(CC) $(CFLAGS) -c wav_writer.c

album_bst.o: album_bst.c album_bst.h
	$(CC) $(CFLAGS) -c album_bst.c

filters.o: filters.c filters.h
	$(CC) $(CFLAGS) -c filters.c

clean:
	rm -f $(OBJS) $(TARGET)
