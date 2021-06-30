const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.js')
const axios = require('axios')
const disbut = require('discord-buttons');
disbut(client);

function buttons() {

  let prev_button = new disbut.MessageButton()
    .setLabel('<')
    .setStyle('grey')
    .setID('prev_button')

  let read_button = new disbut.MessageButton()
  .setLabel('Read Manga')
  .setStyle('green')
  .setID('read_button')

  let next_button = new disbut.MessageButton()
    .setLabel('>')
    .setStyle('grey')
    .setID('next_button')

  return new disbut.MessageActionRow()
    .addComponent(prev_button)
    .addComponent(read_button)
    .addComponent(next_button);

}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === '~ping') {
    msg.reply('pong');
  }
});

let total_results
let search_results
let offset
let current_search

let manga = async () => {
  let manga = search_results[search_index]
  let manga_id = manga.data.id
  let cover_id = manga.relationships.find(a => a.type === 'cover_art').id
  
  let cover = await axios.get('https://api.mangadex.org/cover/' + cover_id)

  let cover_file = cover.data.data.attributes.fileName

  let tags = manga.data.attributes.tags.map(tag => tag.attributes.name.en)

  let tag_string = tags.join(', ')

  return new Discord.MessageEmbed()
    .setColor(0xffaffa)
    .setTitle(manga.data.attributes.title.en)
    .setURL('https://mangadex.org/title/' + manga_id)
    .setImage('https://uploads.mangadex.org/covers/'+ manga_id + '/' + cover_file)
    .setDescription('>>> ' + manga.data.attributes.description.en)
    .addField('Tags', tag_string)
    .setAuthor('Result ' + (search_index + 1) + ' of ' + total_results)

}

client.on('message', async msg => {
  const cmd = msg.content.split(' ')[0]
  if (cmd === '~search') {

    if (current_search) {
      await current_search.delete()
    }

    const query = msg.content.substring(8)
    const response = await axios.get('https://api.mangadex.org/manga?title=' + query)
    total_results = response.data.total
    search_results = response.data.results
    offset = 0
    search_index = 0

    if (search_results.length) {

      let embed = await manga()
      current_search = await msg.reply({ component: buttons(), embed })

    }
    else {
      msg.reply(new Discord.MessageEmbed()
        .setColor(0xffaffa)
        .setTitle('No Results Found')
      )
    }
  }
});

client.on('clickButton', async (button) => {
  if (button.id === 'next_button') {
    if (search_index < total_results - 1) {
      search_index++

      if (!search_results[search_index]) {
        offset += 10
        const next_page = await axios.get('https://api.mangadex.org/manga?title=' + query + '&offset=' + offset)
        search_results = search_results.concat(next_page.data.results)
      }

      let embed = await manga()
      await button.message.edit({ component: buttons(), embed })
      await button.defer()
    }
    else {
      await button.reply.send('Reached End of Results', true);
    }
  }
});

client.on('clickButton', async (button) => {
  if (button.id === 'prev_button') {
    if (search_index > 0) {
      search_index--

      let embed = await manga()
      await button.message.edit({ component: buttons(), embed })
      await button.defer()
    }
    else {
      await button.reply.send('Reached Beginning of Results', true);
    }
  }
});

client.login(config.auth_token);