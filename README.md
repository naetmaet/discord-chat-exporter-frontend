# how to use

step 1: archive a server using https://github.com/Tyrrrz/DiscordChatExporter make sure to export it as Json. files that are too large will not work (300-500mb should be fine)
if you're gonna use the cli tool do it like this
```
discord-chat-exporter-cli export -c channel_id -t your_token -f json -p 300mb
```
if you're gonna use the --media flag then you will have to clone the repository to view media. Otherwise feel free to use here https://naetmaet.github.io/discord-chat-exporter-frontend/

# flags
there are currently 9 flags that you can use to narrow down results here's a list of them

* -replies (shows the messages replying to people and messages being replied to)
* -reply (this only shows the messages being replied to)
* -embeds
* -media
* -nomedia
* -noembeds
* -mentions
* -videos
* -images
* -stickers
* -conversations (loads pages as conversations that are calculated by the time they were sent compared to each other)

## searching flags

currently there's only mentions: and from:
you can use quotes for spaces and it also supports regex and ids
you can escape the flags like this \-images to search for literally "-images"

searching is done with regex and is case insensitive 
