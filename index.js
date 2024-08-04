const fileInput = document.getElementById("file-input");
const messageContainer = document.querySelector(".message-container");
const channelHeader = document.querySelector(".channel-header");
const channelIcon = channelHeader.querySelector(".channel-icon");
const channelName = channelHeader.querySelector(".channel-name");
const pagination = document.querySelector(".pagination");
const prevButton = document.getElementById("prev-button");
const nextButton = document.getElementById("next-button");
const pageInput = document.getElementById("page-input");
const pageCountElement = document.getElementById("page-count");
const messageCountElement = document.getElementById("message-count");
const searchInput = document.getElementById("search-input");
const loadButton = document.getElementById("load-button");
const urlInput = document.getElementById("url-input");

let messages = [];
let messagesObj = {};
let chunkSize = 50;
let currentPage = 1;
let totalPages = 1;
let filteredMessages = [];
let conversations = [];
fileInput.addEventListener("change", (e) => {
  const file = fileInput.files[0];
  const reader = new FileReader();
  reader.onload = (event) => {
    const jsonData = JSON.parse(event.target.result);
    messages = jsonData.messages;
    messagesObj = [];
    conversations = [];
    filteredMessages = [];
    let lastmessage;
    let convo = 0;
    messages.forEach((msg, n) => {
      messagesObj[msg.id] = msg;
      messagesObj[msg.id].context=n
      if (n) {
        let lastMessageTime = new Date(lastmessage.timestamp).getTime();
        let messageTime = new Date(msg.timestamp).getTime();
        if (lastMessageTime + 2000000 > messageTime || msg.type === "Reply") {
          conversations[convo].push(msg);
        } else {
          convo++;
          conversations[convo] = [msg];
        }
      } else {
        conversations[0] = [msg];
      }
      lastmessage = msg;
    });
    filteredMessages = messages;
    renderChannelHeader(jsonData);
    renderMessagesChunk(filteredMessages);
    updatePagination(filteredMessages.length);
  };
  reader.readAsText(file);
});

const currentUrl = new URL(window.location.href);
const archiveUrl = currentUrl.searchParams.get("archive");

if (archiveUrl) {
  fetch(archiveUrl)
    .then((response) => response.json())
    .then((jsonData) => {
      messages = jsonData.messages;
      messagesObj = {};
      conversations = [];
      filteredMessages = [];
      let lastMessage;
      let convo = 0;
      messages.forEach((msg, n) => {
        messagesObj[msg.id] = msg;
        if (n) {
          let lastMessageTime = new Date(lastMessage.timestamp).getTime();
          let messageTime = new Date(msg.timestamp).getTime();
          if (lastMessageTime + 2000000 > messageTime || msg.type === "Reply") {
            conversations[convo].push(msg);
          } else {
            convo++;
            conversations[convo] = [msg];
          }
        } else {
          conversations[0] = [msg];
        }
        lastMessage = msg;
      });
      filteredMessages = messages;
      document
        .querySelector('meta[property="og:title"]')
        .setAttribute("content", jsonData.channel.name);
      document
        .querySelector('meta[property="og:image"]')
        .setAttribute("content", jsonData.guild.iconUrl);

      renderChannelHeader(jsonData);
      renderMessagesChunk(filteredMessages);
      updatePagination(filteredMessages.length);
      document
        .querySelector('meta[property="og:description"]')
        .setAttribute(
          "content",
          `${jsonData.guild.name} - ${jsonData.channel.name}\n serving ${messages.length} messages!`
        );
    })
    .catch((error) => console.error("Error fetching data:", error));
} else {
  loadButton.addEventListener("click", () => {
    const url = urlInput.value.trim();
    if (url) {
      fetch(url)
        .then((response) => response.json())
        .then((jsonData) => {
          messages = jsonData.messages;
          messagesObj = {};
          conversations = [];
          filteredMessages = [];
          let lastMessage;
          let convo = 0;
          messages.forEach((msg, n) => {
            messagesObj[msg.id] = msg;
            if (n) {
              let lastMessageTime = new Date(lastMessage.timestamp).getTime();
              let messageTime = new Date(msg.timestamp).getTime();
              if (
                lastMessageTime + 2000000 > messageTime ||
                msg.type === "Reply"
              ) {
                conversations[convo].push(msg);
              } else {
                convo++;
                conversations[convo] = [msg];
              }
            } else {
              conversations[0] = [msg];
            }
            lastMessage = msg;
          });
          filteredMessages = messages;

          renderChannelHeader(jsonData);
          renderMessagesChunk(filteredMessages);
          updatePagination(filteredMessages.length);
        })
        .catch((error) => console.error("Error fetching data:", error));
    }
  });
}
let searchModifiers = {
  "-images": "hasImages",
  "-videos": "hasVideos",
  "-nomedia": "hasNoMedia",
  "-replies": "hasReplies",
  "-reply": "hasReply",
  "-media": "hasMedia",
  "-embeds": "hasEmbeds",
  "-stickers": "hasSticker",
  "-edits": "hasEdits",
  "-conversations": "hasConversations",
  "from:": "fromUser",
  "-nomedia": "noMedia",
  "-mentions": "hasMentions",
  "mentions:": "mentionsUser",
  "-noembeds": "noEmbeds",
  "-stickers": "hasStickers",
};

let modifiers = {};
let modifierValues = {};

searchInput.addEventListener("input", () => {
  let searchTerm = searchInput.value.trim();
  modifiers = {};
  modifierValues = {};
  currentPage = 1;
  let savedTerm = searchTerm;

  Object.keys(searchModifiers).forEach((modifier) => {
    const regex = new RegExp(modifier, "i");
    if (searchTerm.match(regex)) {
      if (modifier.startsWith("-"))
        searchTerm = searchTerm.replace(regex, "").trim();

      modifiers[searchModifiers[modifier]] = true;
      if (modifier.startsWith("from:") || modifier.startsWith("mentions:")) {
        modifierValues[searchModifiers[modifier]] = searchTerm;
        searchTerm = searchTerm
          .replace(new RegExp(/(from|mentions):\s?("(.+)"|\S+)/gi), "")
          .trim();
      }
    }
  });

  Object.keys(searchModifiers).forEach((modifier) => {
    if (searchTerm.includes(`\\${modifier}`)) {
      searchTerm = searchTerm.replace(`\\${modifier}`, modifier).trim();
    }
  });

  let messagesToFilter = modifiers.hasConversations ? conversations : messages;
  filteredMessages = messagesToFilter;
  if (searchTerm) {
    let regex;
    try {
      regex =
        searchTerm.startsWith("/") && searchTerm.endsWith("/")
          ? new RegExp(searchTerm.slice(1, -1), "gi")
          : new RegExp(searchTerm, "gi");
      messagesToFilter = modifiers.hasConversations
        ? messagesToFilter.map((conversation) =>
            conversation.filter((message) => regex.test(message.content))
          )
        : messagesToFilter.filter((message) => regex.test(message.content));
    } catch (e) {
      console.error(`Invalid regex pattern: ${searchTerm}`);
      messagesToFilter = [];
    }
  }

  const filterFunctions = {
    //WIP
  };
  Object.keys(modifiers).forEach((key) => {
    if (modifiers[key]) {
      switch (key) {
        case "hasEmbeds":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter
              .map((conversation) => {
                return conversation.filter((message) => message.embeds.length);
              })
              .filter((conversation) => conversation.length);
          } else {
            messagesToFilter = messagesToFilter.filter(
              (message) => message.embeds.length
            );
          }
          break;

        case "noEmbeds":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter
              .map((conversation) => {
                return conversation.filter((message) => !message.embeds.length);
              })
              .filter((conversation) => !conversation.length);
          } else {
            messagesToFilter = messagesToFilter.filter(
              (message) => !message.embeds.length
            );
          }
          break;
        case "hasMedia":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter
              .map((conversation) => {
                return conversation.filter(
                  (message) => message.attachments.length
                );
              })
              .filter((conversation) => conversation.length);
          } else {
            messagesToFilter = messagesToFilter.filter(
              (message) => message.attachments.length
            );
          }
          break;

        case "hasEdits":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter
              .map((conversation) => {
                return conversation.filter(
                  (message) => message.timestampEdited
                );
              })
              .filter((conversation) => conversation.length);
          } else {
            messagesToFilter = messagesToFilter.filter(
              (message) => message.timestampEdited
            );
          }
          break;

        case "hasMentions":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter
              .map((conversation) => {
                return conversation.filter(
                  (message) => message.reference?.messageId
                );
              })
              .filter((conversation) => conversation.length);
          } else {
            messagesToFilter = messagesToFilter.filter(
              (message) => message.reference?.messageId
            );
          }
          break;

        case "hasEdits":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter
              .map((conversation) => {
                return conversation.filter(
                  (message) => message.timestampEdited
                );
              })
              .filter((conversation) => conversation.length);
          } else {
            messagesToFilter = messagesToFilter.filter(
              (message) => message.timestampEdited
            );
          }
          break;

        case "hasStickers":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter
              .map((conversation) => {
                return conversation.filter(
                  (message) => message.stickers.length
                );
              })
              .filter((conversation) => conversation.length);
          } else {
            messagesToFilter = messagesToFilter.filter(
              (message) => message.stickers.length
            );
          }
          break;

        case "hasImages":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter
              .map((conversation) => {
                return conversation.filter((message) =>
                  message.attachments.some(
                    (attachment) =>
                      attachment.fileName.endsWith(".jpg") ||
                      attachment.fileName.endsWith(".jpeg") ||
                      attachment.fileName.endsWith(".png") ||
                      attachment.fileName.endsWith(".gif")
                  )
                );
              })
              .filter((conversation) => conversation.length > 0);
          } else {
            messagesToFilter = messagesToFilter.filter((message) =>
              message.attachments?.some(
                (attachment) =>
                  attachment.fileName.endsWith(".jpg") ||
                  attachment.fileName.endsWith(".jpeg") ||
                  attachment.fileName.endsWith(".png") ||
                  attachment.fileName.endsWith(".gif")
              )
            );
          }
          break;
        case "hasVideos":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter.map((conversation) => {
              return conversation.filter((message) =>
                message.attachments.some(
                  (attachment) =>
                    attachment.fileName.endsWith(".mp4") ||
                    attachment.fileName.endsWith(".webm") ||
                    attachment.fileName.endsWith(".mov")
                )
              );
            });
          } else {
            messagesToFilter = messagesToFilter.filter((message) =>
              message.attachments.some(
                (attachment) =>
                  attachment.fileName.endsWith(".mp4") ||
                  attachment.fileName.endsWith(".webm") ||
                  attachment.fileName.endsWith(".mov")
              )
            );
          }
          break;
        case "fromUser":
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter.map((conversation) => {
              let regex = new RegExp(/from:\s?("(.+)"|\S+)/i);
              let user = savedTerm.match(regex);
              user = user[2] || user[1];
              return conversation.filter(
                (message) =>
                  new RegExp(user, "i").test(message.author.name) ||
                  message.author?.id === user
              );
            });
          } else {
            let regex = new RegExp(/from:\s?("(.+)"|\S+)/i);
            let user = savedTerm.match(regex);
            user = user[2] || user[1];

            messagesToFilter = messagesToFilter.filter(
              (message) =>
                new RegExp(user, "i").test(message.author.name) ||
                message.author?.id === user
            );
          }
          break;
        case "mentionsUser":
          console.log("works?");
          if (modifiers.hasConversations) {
            messagesToFilter = messagesToFilter.map((conversation) => {
              let regex = new RegExp(/mentions:\s?("(.+)"|\S+)/i);
              let user = savedTerm.match(regex);

              user = user[2] || user[1];

              return conversation.filter(
                (message) =>
                  RegExp(user, "i").test(
                    messagesObj[message.reference?.messageId]?.author.name
                  ) ||
                  messagesObj[message.reference?.messageId]?.author.id === user
              );
            });
          } else {
            console.log("o");
            let regex = new RegExp(/mentions:\s?("(.+)"|\S+)/i);
            let user = savedTerm.match(regex);
            user = user[2] || user[1];
            console.log(user);
            messagesToFilter = messagesToFilter.filter(
              (message) =>
                RegExp(user, "i").test(
                  messagesObj[message.reference?.messageId]?.author.name
                ) || message.reference?.messageId === user
            );
          }
          break;
        default:
          break;
      }
      if (modifiers.hasConversations) {
        messagesToFilter = messagesToFilter.filter((a) => a.length);
      }
    }
  });

  if (modifiers.hasReplies || modifiers.hasReply) {
    if (modifiers.hasConversations) {
      messagesToFilter = messagesToFilter.map((conversation) => {
        let acc = [];
        conversation.forEach((message, n) => {
          if (
            !modifiers.hasReply &&
            messagesObj[message.reference?.messageId]
          ) {
            acc.push(messagesObj[message.reference.messageId]);
          }
          if (message.type === "Reply") {
            acc.push(message);
          }
        });
        return acc;
      });
    } else {
      let acc = [];
      messagesToFilter = messagesToFilter.forEach((message) => {
        if (!modifiers.hasReply && messagesObj[message.reference?.messageId]) {
          acc.push(messagesObj[message.reference.messageId]);
        }
        if (message.type === "Reply") {
          acc.push(message);
        }
      });
      messagesToFilter = acc;
    }
  }
  filteredMessages = messagesToFilter;
  renderMessagesChunk(filteredMessages);
  updatePagination(filteredMessages.length);
});

function renderChannelHeader(jsonData) {
  channelIcon.src = jsonData.guild.iconUrl;
  channelName.textContent = `${jsonData.guild.name} #${jsonData.channel.name}`;
}

function renderMessagesChunk(messages = []) {
  if (modifiers.hasConversations) {
    chunk = messages[0]?.[0] ? messages[currentPage - 1] : messages;
  } else {
    chunk = messages.slice(
      (currentPage - 1) * chunkSize,
      currentPage * chunkSize
    );
  }

  renderMessages(chunk);
}

function textToHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function renderMessages(messages) {
  let messageHTML = messages
    .map((message) => {
      let replyHTML = "";
      if (message.type === "Reply") {
        const originalMessage = messagesObj[message.reference.messageId];
        if (originalMessage) {
          replyHTML = `<span class="reply" style="color: #bcbcbc;">Replying to <span class="mention">@${
            originalMessage.author.nickname
          }</span>: ${textToHtml(originalMessage.content)}</span><br>`;
        } else {
          replyHTML = `<i class="reply" style="color: #bcbcbc; font-size:12px;">Message could not be loaded!</i><br>`;
        }
      }
      return `
        <div class="message" id="message-id-${message.id}">
        <img src="${message.author.avatarUrl}" alt="" class="avatar">
        <div class="message-content"><a href="javascript:jumpToMessage('${message.id}')" style="color:grey;text-decoration:none;">jump to message</a><br>
        ${replyHTML}
        <span class="author" style = "color:${
          message.author.color || "#FFFFFF"
        };">${textToHtml(
        message.author.nickname + ` (${message.author.name})` ||
          message.author.name
      )}</span>
        <span class="timestamp">${textToHtml(
          formatTime(new Date(message.timestamp))
        )}</span>
        <br><span class="content">${marked.marked(
          textToHtml(message.content)
            .replace(/\n/gm, "<br>")
            .replace(/https?:\/\/[^\s]+/g, (url) => {
              return `<a href="${url}" target="_blank">${url}</a>`;
            })
            .replace(/@(.+?)\b/g, (match, username) => {
              return `<span class="mention">@${username}</span>`;
            })
        )}</span>
        ${
          message.timestampEdited
            ? `<p class="content" style='color:#bcbcbc; font-size:12px;'>(edited at ${textToHtml(
                formatTime(new Date(message.timestampEdited))
              )})</p>`
            : ""
        }
        ${
          message.attachments && message.attachments.length > 0
            ? renderAttachments(message.attachments)
            : ""
        }
        ${
          message.stickers && message.stickers.length > 0
            ? renderStickers(message.stickers)
            : ""
        }
        ${
          message.embeds && message.embeds.length > 0
            ? "<br>" + renderEmbeds(message.embeds)
            : ""
        }
        ${
          message.reactions && message.reactions.length > 0
            ? "<br>" + renderReactions(message.reactions)
            : ""
        }

        </div>
        </div>
        `;
    })
    .join("");
  messageContainer.innerHTML = messageHTML;
}

function formatTime(date) {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear().toString().slice(2);
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
}

function renderReplies(replies) {
  return replies
    .map((reply) => {
      const author = reply.author.nickname
        ? `${reply.author.nickname} (${reply.author.name})`
        : reply.author.name;
      return `<span class="reply-author">${textToHtml(
        author
      )}</span>: ${textToHtml(reply.content)}`;
    })
    .join("<br>");
}

function renderStickers(stickers) {
  if (!stickers[0].sourceUrl.toLowerCase().endsWith(".png")) {
    return stickers
      .map(
        (sticker) =>
          `<br><span class="sticker">[sticker: ${sticker.name}]</span>`
      )
      .join("");
  }
  const sticker = stickers[0];
  return `<br><img src="${sticker.sourceUrl}" alt="${sticker.name}" style="max-width: 300px; height: 200px;"><br><p style="color:#bcbcbc; font-size:12px;">sticker: ${sticker.name}</p>`;
}

function renderReactions(reactions) {
  return reactions
    .map((reaction) => {
      const emoji = reaction.emoji.imageUrl
        ? `<img width="15" width="15" src="${reaction.emoji.imageUrl}">`
        : reaction.emoji.name;
      return `<span class="reaction">${emoji} ${reaction.count}</span>`;
    })
    .join("");
}

function renderAttachments(attachments) {
  let count = 0;
  return attachments
    .map((attachment) => {
      count++;
      let html = `${count % 2 && "<br>"}`;
      if (
        attachment.fileName.endsWith(".jpg") ||
        attachment.fileName.endsWith(".jpeg") ||
        attachment.fileName.endsWith(".png") ||
        attachment.fileName.endsWith(".gif")
      ) {
        html += `<img src="${attachment.url}" alt="${attachment.fileName}" style="max-width: 50%; max-height: 100%;">`;
      } else if (
        attachment.fileName.endsWith(".mp4") ||
        attachment.fileName.endsWith(".webm") ||
        attachment.fileName.endsWith(".mov")
      ) {
        html += `<br><video width="300" height="200" controls><source src="${
          attachment.url
        }" type="video/${
          (attachment.fileName.endsWith(".mov") ? "mov" : 0) ||
          attachment.fileName.endsWith(".mp4")
            ? "mp4"
            : "webm"
        }"></video>`;
      } else {
        html += `<a href="${attachment.url}" target="_blank">${attachment.fileName}</a>`;
      }
      return html;
    })
    .join("");
}

let currentlyHighlightedMessage

function jumpToMessage(messageId) {
  modifiers.hasConversations=false
  if (currentlyHighlightedMessage) {
    currentlyHighlightedMessage.classList.remove('highlighted');
    currentlyHighlightedMessage.style.backgroundColor = ''; 
  }

  const message = messagesObj[messageId];

  if (message) {
    const pageIndex = Math.floor((1+message.context) / chunkSize);
    currentPage = pageIndex + 1;
    filteredMessages = messages;
    updatePagination();
    renderMessagesChunk(messages)

    const messageElement = document.getElementById(`message-id-${messageId}`);
    messageElement.classList.add('highlighted');
    messageElement.style.backgroundColor = '#444037';
    currentlyHighlightedMessage = messageElement;
    messageElement.scrollIntoView()
    setTimeout(() => {
      messageElement.style.backgroundColor=""
    }, 3000);
  }
}

function renderEmbeds(embeds) {
  return embeds
    .map((embed) => {
      let html = `<div class="embed-outer"><div class="embed-inner">`;
      let desc = `<p class="embed-description">${marked.marked(
        embed.description
      )}</p>`;
      let thumb = "";
      if (embed.author) {
        html += `<p class="embed-author"><img src="${embed.author.url}" alt="" class="embed-footer-icon">${embed.author.name}</p>`;
      }

      if (embed.thumbnail) {
        if (
          (embed.description &&
            embed.thumbnail.width <= 200 &&
            embed.thumbnail.height <= 200) ||
          embed.image
        ) {
          html += `<img src="${embed.thumbnail.url}" alt="${embed.title}" class="embed-thumbnail">`;
        } else if (embed.thumbnail && !embed.video) {
          thumb = `<img src="${embed.thumbnail.url}" alt="${embed.title}" class="embed-image">`;
        }
      }

      if (embed.title) {
        html += `<h3><a href="${embed.url}" class="embed-title" target="_blank">${embed.title}</a></h3>`;
      }

      if (embed.description) {
        html += `${desc}`;
        html += thumb;
      } else {
        html += thumb;
      }

      if (embed.video) {
        let isDiscordVideo = [
          "cdn.discordpp.com",
          "media.discordapp.net",
          ".mp4",
          ".webm",
          ".mov",
        ].some((check) => embed.video.url.includes(check));
        html += isDiscordVideo
          ? `<video src="${embed.video.url}" alt="${embed.title}" class="embed-video" controls></video>`
          : `<iframe sandbox="allow-same-origin allow-scripts" src="${embed.video.url}" frameborder="0" allowfullscreen width="100%" height="100%"></iframe>`;
      } else if (embed.image) {
        html += `<img src="${embed.image.url}" alt="${embed.title}" class="embed-image">`;
      }

      html += `<div class="embed-content">`;
      if (embed.fields.length > 0) {
        html += "<ul>";
        embed.fields.forEach((field) => {
          html += `<li class="${field.inline ? "inline" : ""}"><strong>${
            field.name
          }</strong>: ${marked.marked(field.value)}</li>`;
        });
        html += "</ul>";
      }
      if (embed.footer) {
        html += `<p class="embed-footer"><img src="${embed.footer.iconUrl}" alt="" class="embed-footer-icon">${embed.footer.text}</p>`;
      }
      html += `</div></div></div>`;
      return html;
    })
    .join("");
}

function updatePagination(totalMessages = messages.length) {
  let chunksize = chunkSize;
  totalPages = 0;
  let msgs = 0;
  if (modifiers.hasConversations) {
    for (let x = 0; x < filteredMessages.length; ++x) {
      totalPages++;
      msgs += filteredMessages?.[x]?.length;
    }
  } else {
    totalPages = Math.ceil(totalMessages / chunksize);
  }
  pageInput.value = currentPage;
  pageInput.max = totalPages;
  pageCountElement.textContent = `Page ${currentPage} of ${totalPages}`;
  messageCountElement.textContent = `Number of messages:${
    msgs || totalMessages
  }`;
}

prevButton.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderMessagesChunk(filteredMessages);
    updatePagination(filteredMessages.length);
  }
});

nextButton.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    renderMessagesChunk(filteredMessages);
    updatePagination(filteredMessages.length);
  }
});

pageInput.addEventListener("input", () => {
  const pageNumber = parseInt(pageInput.value);
  if (pageNumber > 0 && pageNumber <= totalPages) {
    currentPage = pageNumber;
    renderMessagesChunk(filteredMessages);
    updatePagination(filteredMessages.length);
  }
});
