const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.js')
const axios = require('axios')
const disbut = require('discord-buttons');
disbut(client);

function search_buttons() {

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
let current_message
let query

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

    if (current_message) {
      current_message.delete()
    }

    query = msg.content.substring(8)
    const response = await axios.get('https://api.mangadex.org/manga?title=' + query)
    total_results = response.data.total
    search_results = response.data.results
    offset = 0
    search_index = 0

    if (search_results.length) {

      let embed = await manga()
      current_message = await msg.reply({ component: search_buttons(), embed })

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
  if (button.id === 'prev_button') {
    if (search_index > 0) {
      search_index--

      let embed = await manga()
      current_message.delete()
      current_message = await button.channel.send({ component: search_buttons(), embed })
      await button.defer()
    }
    else {
      await button.reply.send('Reached Beginning of Results', true);
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
      current_message.delete()
      current_message = await button.channel.send({ component: search_buttons(), embed })
      await button.defer()
    }
    else {
      await button.reply.send('Reached End of Results', true);
    }
  }
});

let current_manga
let page_index = 0
let chapter_offset = 0
let chapter
let total_chapters
let server_url

client.on('clickButton', async (button) => {
  if (button.id === 'read_button') {
    let manga = search_results[search_index]
    current_manga = manga.data.id

    let chapters = await axios.get('https://api.mangadex.org/chapter?translatedLanguage[]=en&manga=' + current_manga + '&offset=' + chapter_offset)
    chapter = chapters.data.results[0]
    total_chapters = chapters.data.total

    let server = await axios.get('https://api.mangadex.org/at-home/server/' + chapter.data.id)

    server_url = server.data.baseUrl

    let prev_page = new disbut.MessageButton()
    .setLabel('<')
    .setStyle('grey')
    .setID('prev_page')

    let next_page = new disbut.MessageButton()
      .setLabel('>')
      .setStyle('grey')
      .setID('next_page')

    let row = new disbut.MessageActionRow()
      .addComponent(prev_page)
      .addComponent(next_page)

    let embed = new Discord.MessageEmbed()
      .setColor(0xffaffa)
      .setAuthor('Ch. ' + chapter.data.attributes.chapter + ': ' + chapter.data.attributes.title)
      .setImage(server_url + '/data/' + chapter.data.attributes.hash + '/' + chapter.data.attributes.data[page_index])
      .setFooter('Page ' + (page_index + 1) + ' of ' + chapter.data.attributes.data.length)
      
    current_message.delete()
    current_message = await button.channel.send(server_url + '/data/' + chapter.data.attributes.hash + '/' + chapter.data.attributes.data[page_index], row)

    await button.defer()
  }
});

client.on('message', async msg => {
  const cmd = msg.content.split(' ')[0]
  const arg = msg.content.split(' ')[1]
  if (cmd === '~chapter') {

    if (!current_manga) {
      msg.reply({ 'embed' : { 'description' : 'Not currently reading any manga!' }})
      return
    }

    if (isNaN(arg) || +arg < 1) {
      msg.reply({ 'embed' : { 'description' : 'Invalid Chapter Number' }})
      return
    }

    if (arg > total_chapters ) {
      msg.reply({ 'embed' : { 'description' : 'Chapter not available!' }})
      return
    }

    chapter_offset = arg
    let chapters = await axios.get('https://api.mangadex.org/chapter?translatedLanguage[]=en&manga=' + current_manga + '&offset=' + chapter_offset)
    chapter = chapters.data.results[0]
    total_chapters = chapters.data.total
    page_index = 0

    let prev_page = new disbut.MessageButton()
    .setLabel('<')
    .setStyle('grey')
    .setID('prev_page')

    let next_page = new disbut.MessageButton()
      .setLabel('>')
      .setStyle('grey')
      .setID('next_page')

    let row = new disbut.MessageActionRow()
      .addComponent(prev_page)
      .addComponent(next_page)

    current_message.delete()
    current_message = await msg.channel.send(server_url + '/data/' + chapter.data.attributes.hash + '/' + chapter.data.attributes.data[page_index], row)

  }
});

client.on('clickButton', async (button) => {
  if (button.id === 'next_page') {

    page_index++

    if (page_index >= chapter.data.attributes.data.length) {
      chapter_offset++
      if (chapter_offset >= total_chapters) {

        let embed = new Discord.MessageEmbed()
          .setColor(0xffaffa)
          .setDescription('You\'ve reached the end of currently available chapters.')

        await current_message.delete()
        await button.channel.send(embed)
        await button.defer()
        return
      }
      let chapters = await axios.get('https://api.mangadex.org/chapter?translatedLanguage[]=en&manga=' + current_manga + '&offset=' + chapter_offset)
      chapter = chapters.data.results[0]

      page_index = 0
    }

    let prev_page = new disbut.MessageButton()
    .setLabel('<')
    .setStyle('grey')
    .setID('prev_page')

    let next_page = new disbut.MessageButton()
      .setLabel('>')
      .setStyle('grey')
      .setID('next_page')

    let row = new disbut.MessageActionRow()
      .addComponent(prev_page)
      .addComponent(next_page)

    let embed = new Discord.MessageEmbed()
      .setColor(0xffaffa)
      .setAuthor('Ch. ' + chapter.data.attributes.chapter + ': ' + chapter.data.attributes.title)
      .setImage(server_url + '/data/' + chapter.data.attributes.hash + '/' + chapter.data.attributes.data[page_index])
      .setFooter('Page ' + (page_index + 1) + ' of ' + chapter.data.attributes.data.length)

    current_message.delete()
    current_message = await button.channel.send(server_url + '/data/' + chapter.data.attributes.hash + '/' + chapter.data.attributes.data[page_index], row)

    await button.defer()
  }
});

client.on('clickButton', async (button) => {
  if (button.id === 'prev_page') {

    if (page_index === 0) {
      if (chapter_offset === 0) {
        await button.reply.send('This is the beginning of the manga!', true)
        return
      }
      chapter_offset--

      let chapters = await axios.get('https://api.mangadex.org/chapter?translatedLanguage[]=en&manga=' + current_manga + '&offset=' + chapter_offset)
      chapter = chapters.data.results[0]

      page_index = chapter.data.attributes.data.length - 1

    }
    else {
      page_index--
    }

    let prev_page = new disbut.MessageButton()
    .setLabel('<')
    .setStyle('grey')
    .setID('prev_page')

    let next_page = new disbut.MessageButton()
      .setLabel('>')
      .setStyle('grey')
      .setID('next_page')

    let row = new disbut.MessageActionRow()
      .addComponent(prev_page)
      .addComponent(next_page)

    let embed = new Discord.MessageEmbed()
      .setColor(0xffaffa)
      .setAuthor('Ch. ' + chapter.data.attributes.chapter + ': ' + chapter.data.attributes.title)
      .setImage(server_url + '/data/' + chapter.data.attributes.hash + '/' + chapter.data.attributes.data[page_index])
      .setFooter('Page ' + (page_index + 1) + ' of ' + chapter.data.attributes.data.length)
      
    await current_message.delete()
    current_message = await button.channel.send(server_url + '/data/' + chapter.data.attributes.hash + '/' + chapter.data.attributes.data[page_index], row)

    await button.defer()
  }
});

client.login(config.auth_token);