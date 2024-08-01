const fileInput = document.getElementById('file-input');
const messageContainer = document.querySelector('.message-container');
const channelHeader = document.querySelector('.channel-header');
const channelIcon = channelHeader.querySelector('.channel-icon');
const channelName = channelHeader.querySelector('.channel-name');
const pagination = document.querySelector('.pagination');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const pageInput = document.getElementById('page-input');
const pageCountElement = document.getElementById('page-count');
const searchInput = document.getElementById('search-input');

let messages = [];
let messagesObj={}
let chunkSize = 50;
let currentPage = 1;
let totalPages = 1;
let filteredMessages = [];

fileInput.addEventListener('change', (e) => {
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        const jsonData = JSON.parse(event.target.result);
        messages = jsonData.messages;
        messagesObj={}
        messages.forEach(msg=>messagesObj[msg.id]=msg)
        filteredMessages = messages;
        renderChannelHeader(jsonData);
        renderMessagesChunk(filteredMessages);
        updatePagination(filteredMessages.length);
    };
    reader.readAsText(file);
});

const searchModifiers = {
    '-images': 'hasImages',
    '-videos': 'hasVideos',
    '-nomedia': 'hasNoMedia',
    '-mentions': 'hasMentions',
    '-replies': 'hasReplies',
    '-reply': 'hasReply',
    '-media':"hasMedia",
    '-embeds':"hasEmbeds",
    '-stickers': 'hasSticker'
};


searchInput.addEventListener('input', () => {
  let searchTerm = searchInput.value.trim();
  let modifiers = {};

  Object.keys(searchModifiers).forEach((modifier) => {
    if (searchTerm.includes(modifier) && !searchTerm.includes(`\\${modifier}`)) {
      modifiers[searchModifiers[modifier]] = true;
      searchTerm = searchTerm.replace(modifier, '').trim();
    }
  });
  Object.keys(searchModifiers).forEach((modifier) => {
    if (searchTerm.includes(`\\${modifier}`)) {
      searchTerm = searchTerm.replace(`\\${modifier}`, modifier).trim();
    }
  });

  filteredMessages = messages;
  if (searchTerm) {
    let regex;
    try {
      if (searchTerm.startsWith('/') && searchTerm.endsWith('/')) {
        regex = new RegExp(searchTerm.slice(1, -1), 'gi');
      } else {
        regex = new RegExp(searchTerm, 'gi');
      }
      filteredMessages = filteredMessages.filter((message) => regex.test(message.content));
    } catch (e) {
      console.error(`Invalid regex pattern: ${searchTerm}`);
      filteredMessages = [];
    }
  }

  if (modifiers.hasImages || modifiers.hasVideos || modifiers.hasNoMedia || modifiers.hasMedia) {
    filteredMessages = filteredMessages.filter((message) => {
      if (modifiers.hasMedia) {
        return message.attachments.length > 0
      }
      let hasMatchingAttachment = false;
      if (modifiers.hasImages) {
        hasMatchingAttachment = hasMatchingAttachment || message.attachments.some((attachment) => attachment.fileName.endsWith('.jpg') || attachment.fileName.endsWith('.jpeg') || attachment.fileName.endsWith('.png') || attachment.fileName.endsWith('.gif'));
      }
      if (modifiers.hasVideos) {
        hasMatchingAttachment = hasMatchingAttachment || message.attachments.some((attachment) => attachment.fileName.endsWith('.mp4') || attachment.fileName.endsWith('.webm') || attachment.fileName.endsWith('.mov'));
      }
      if (modifiers.hasNoMedia) {
        hasMatchingAttachment = message.attachments.length === 0;
      }
      return hasMatchingAttachment;
    });
  }
  if (modifiers.hasEmbeds){
    filteredMessages = filteredMessages.filter((message)=>message.embeds.length>0)
  }
  if (modifiers.hasMentions) {
    filteredMessages = filteredMessages.filter((message) => message.mentions.length > 0);
  }

  if (modifiers.hasReplies || modifiers.hasReply) {
    let msgs = [];
    filteredMessages.forEach((message) => {
      if (message.type === "Reply") {
        if (!modifiers.hasReply && messagesObj[message.reference.messageId]) {
          msgs.push(messagesObj[message.reference.messageId]);
          msgs.push(message);
          return;
        }
        msgs.push(message);
      }
    });
    filteredMessages = msgs;
  }

  if (modifiers.hasSticker) {
    filteredMessages = filteredMessages.filter((message) => message.stickers.length > 0);
  }

  currentPage = 1;
  renderMessagesChunk(filteredMessages);
  updatePagination(filteredMessages.length);
});

function renderChannelHeader(jsonData) {
    channelIcon.src = jsonData.guild.iconUrl;
    channelName.textContent = `${jsonData.guild.name} #${jsonData.channel.name}`;
}

function renderMessagesChunk(messages = []) {
    const chunk = messages.slice((currentPage - 1) * chunkSize, currentPage * chunkSize);
    renderMessages(chunk);
}

function textToHtml(text) {
    return text.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

}
function renderMessages(messages) {
    let messageHTML = messages.map((message) => {
        let replyHTML = '';
        if (message.type === "Reply") {
            const originalMessage = messages.find((m) => m.id === message.reference.messageId);
            if (originalMessage) {
                replyHTML = `<span class="reply" style="color: #bcbcbc;">Replying to <span class="mention">@${originalMessage.author.nickname}</span>: ${textToHtml(originalMessage.content)}</span><br>`;
            }
        }
        return `
        <div class="message">
        <img src="${message.author.avatarUrl}" alt="" class="avatar">
        <div class="message-content">
        ${replyHTML}
        <span class="author">${textToHtml(message.author.nickname + ` (${message.author.name})` || message.author.name)}</span>
        <span class="timestamp">${textToHtml(message.timestamp)}</span>
        <br><span class="content">${marked.marked(textToHtml(message.content).replace(/\n/gm, "<br>").replace(/https?:\/\/[^\s]+/g, (url) => {
            return `<a href="${url}" target="_blank">${url}</a>`;
        }).replace(/@(.+?)\b/g, (match, username) => {
            return `<span class="mention">@${username}</span>`;
        }))}</span>
        ${message.timestampEdited ? `<p class="content" style='color:#bcbcbc; font-size:12px;'>(edited at ${textToHtml(message.timestampEdited)})</p>` : ""}
        ${message.attachments && message.attachments.length > 0 ? renderAttachments(message.attachments) : ""}
        ${message.stickers && message.stickers.length > 0 ? renderStickers(message.stickers) : ""}
        ${message.reactions && message.reactions.length > 0 ? "<br>" + renderReactions(message.reactions) : ""}
        ${message.embeds && message.embeds.length>0?"<br>"+renderEmbeds(message.embeds):""}
        </div>
        </div>
        `;
    }).join('');
    messageContainer.innerHTML = messageHTML;
}

function renderReplies(replies) {
  return replies.map((reply) => {
    const author = reply.author.nickname ? `${reply.author.nickname} (${reply.author.name})` : reply.author.name;
    return `<span class="reply-author">${textToHtml(author)}</span>: ${textToHtml(reply.content)}`;
  }).join('<br>');
}

function renderStickers(stickers) {
  if (!stickers[0].sourceUrl.toLowerCase().endsWith(".png")) {
    return stickers.map((sticker) => `<br><span class="sticker">[sticker: ${sticker.name}]</span>`).join('');
  }
  const sticker = stickers[0];
  return `<br><img src="${sticker.sourceUrl}" alt="${sticker.name}" style="max-width: 300px; height: 200px;"><br><p style="color:#bcbcbc; font-size:12px;">sticker: ${sticker.name}</p>`;
}

function renderReactions(reactions) {
  return reactions.map((reaction) => {
    const emoji = reaction.emoji.imageUrl ? `<img width="15" width="15" src="${reaction.emoji.imageUrl}">` : reaction.emoji.name;
    return `<span class="reaction">${emoji} ${reaction.count}</span>`;
  }).join('');
}

function renderAttachments(attachments) {
  let count = 0;
  return attachments.map((attachment) => {
    count++;
    let html = `${count % 2 && "<br>"}`;
    if (attachment.fileName.endsWith('.jpg') || attachment.fileName.endsWith('.jpeg') || attachment.fileName.endsWith('.png') || attachment.fileName.endsWith('.gif')) {
      html += `<img src="${attachment.url}" alt="${attachment.fileName}" style="max-width: 300px; height: 200px;">`;
    } else if (attachment.fileName.endsWith('.mp4') || attachment.fileName.endsWith('.webm') || attachment.fileName.endsWith('.mov')) {
      html += `<br><video width="300" height="200" controls><source src="${attachment.url}" type="video/${(attachment.fileName.endsWith(".mov") ? "mov" : 0) || attachment.fileName.endsWith('.mp4') ? 'mp4' : 'webm'}"></video>`;
    } else {
      html += `<a href="${attachment.url}" target="_blank">${attachment.fileName}</a>`;
    }
    return html;
  }).join('');
}


function renderEmbeds(embeds) {
  return embeds.map((embed) => {
    let html = `<div class="embed-outer"><div class="embed-inner">`;
    let desc = `<p class="embed-description">${marked.marked(embed.description)}</p>`;
    let thumb = "";
    if (embed.author) {
      html += `<p class="embed-author"><img src="${embed.author.url}" alt="" class="embed-footer-icon">${embed.author.name}</p>`;
    }

    if (embed.thumbnail) {
      if (embed.description && (embed.thumbnail.width <= 200 && embed.thumbnail.height <= 200) || embed.image) {
        html += `<img src="${embed.thumbnail.url}" alt="${embed.title}" class="embed-thumbnail">`;
      } else if(embed.thumbnail&&!embed.video) {
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
      let isDiscordVideo = ["cdn.discordpp.com", "media.discordapp.net", ".mp4", ".webm", ".mov"].some((check) => embed.video.url.includes(check));
      html += isDiscordVideo ? `<video src="${embed.video.url}" alt="${embed.title}" class="embed-video" controls></video>` : `<iframe sandbox="allow-same-origin allow-scripts" src="${embed.video.url}" frameborder="0" allowfullscreen width="100%" height="100%"></iframe>`;
        } else if (embed.image) {
      html += `<img src="${embed.image.url}" alt="${embed.title}" class="embed-image">`;
    }

    html += `<div class="embed-content">`;
    if (embed.fields.length > 0) {
      html += '<ul>';
      embed.fields.forEach((field) => {
        html += `<li class="${field.inline ? 'inline' : ''}"><strong>${field.name}</strong>: ${marked.marked(field.value)}</li>`;
      });
      html += '</ul>';
    }
    if (embed.footer) {
      html += `<p class="embed-footer"><img src="${embed.footer.iconUrl}" alt="" class="embed-footer-icon">${embed.footer.text}</p>`;
    }
    html += `</div></div></div>`;
    return html;
  }).join('');
}

function updatePagination(totalMessages = messages.length) {
    totalPages = Math.ceil(totalMessages / chunkSize);
    pageInput.value = currentPage;
    pageInput.max = totalPages;
    pageCountElement.textContent = `Page ${currentPage} of ${totalPages}`;
}

prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
        currentPage--;
        renderMessagesChunk(filteredMessages);
        updatePagination(filteredMessages.length);
    }
});

nextButton.addEventListener('click', () => {
    if (currentPage < totalPages) {
        currentPage++;
        renderMessagesChunk(filteredMessages);
        updatePagination(filteredMessages.length);
    }
});

pageInput.addEventListener('input', () => {
    const pageNumber = parseInt(pageInput.value);
    if (pageNumber > 0 && pageNumber <= totalPages) {
        currentPage = pageNumber;
        renderMessagesChunk(filteredMessages);
        updatePagination(filteredMessages.length);
    }
});
