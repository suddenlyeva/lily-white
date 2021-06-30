const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.js')
const axios = require('axios')

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === '~ping') {
    msg.reply('pong');
  }
});

client.on('message', async msg => {
  const cmd = msg.content.split(' ')[0]
  if (cmd === '~search') {
    const query = msg.content.substring(8)
    const response = await axios.get('https://api.mangadex.org/manga?title=' + query)
    let search_results = response.data.results
    let search_index = 0

    if (search_results.length) {
      let manga = search_results[search_index]
      let manga_id = manga.data.id
      let cover_id = manga.relationships.find(a => a.type === 'cover_art').id
      
      let cover = await axios.get('https://api.mangadex.org/cover/' + cover_id)

      const cover_file = cover.data.data.attributes.fileName

      console.log(manga.data.attributes.tags)

      const tags = manga.data.attributes.tags.map(tag => tag.attributes.name.en)

      const tag_string = tags.join(', ')

      const embed = new Discord.MessageEmbed()
        .setColor(0xffaffa)
        .setTitle(manga.data.attributes.title.en)
        .setURL('https://mangadex.org/title/' + manga_id)
        .setImage('https://uploads.mangadex.org/covers/'+ manga_id + '/' + cover_file)
        .setDescription('>>> ' + manga.data.attributes.description.en)
        .addField('Tags', tag_string)
        .setAuthor('Result ' + (search_index + 1) + ' of ' + response.data.total)
        // .setTimestamp();
      await msg.reply(embed)

    }
  }
});

client.login(config.auth_token);