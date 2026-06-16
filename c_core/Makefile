CC = gcc
CFLAGS = -Wall -Wextra -O2

OBJS = main.o channel.o effects.o mixer.o
TARGET = anarky_daw_core

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $(TARGET) $(OBJS)

main.o: main.c types.h channel.h effects.h mixer.h
	$(CC) $(CFLAGS) -c main.c

channel.o: channel.c channel.h types.h
	$(CC) $(CFLAGS) -c channel.c

effects.o: effects.c effects.h types.h
	$(CC) $(CFLAGS) -c effects.c

mixer.o: mixer.c mixer.h types.h
	$(CC) $(CFLAGS) -c mixer.c

clean:
	rm -f $(OBJS) $(TARGET)
