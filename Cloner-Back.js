const {Client} = require("discord.js-selfbot-v11"); // API  do discord que serve pra controlar bots com seu proprio token
const client = new Client();
var colors = require("colors"); 

async function run(token, original, target, sendEvent) {
  await logAscii();
  process.title = "Cloner de Nerostav";

  client.on("ready", async () => {
    logAscii();
    const servers = [await client.guilds.get(original), await client.guilds.get(target)];
    servers.forEach(server => {
      if (!server) {
        sendEvent({
            type: 'error',
            message: 'Um de seus servidores está inválido, verifique os IDs'
        });
        throw new Error("Servidor inválido");
      }
    });

    let serverData = {
      'textChannels': servers[0].channels.filter(channel => channel.type === "text").sort((channel1, channel2) => channel1.calculatedPosition - channel2.calculatedPosition).map(textChannel => textChannel),
      'voiceChannels': servers[0].channels.filter(channel => channel.type === 'voice').sort((channel1, channel2) => channel1.calculatedPosition - channel2.calculatedPosition).map(voiceChannel => voiceChannel),
      'categories': servers[0].channels.filter(channel => channel.type === 'category').sort((category1, category2) => category1.calculatedPosition - category2.calculatedPosition).map(category => category),
      'roles': servers[0].roles.sort((role1, role2) => role2.calculatedPosition - role1.calculatedPosition).map(role => role)
    };

    process.title = "O Servidor está clonando...: " + servers[0].name;
    log("Deletando servidor atual...", 0x3);
    sendEvent({ type: 'progress', message: 'Deletando Canais e Cargos do servidor alvo...'});
    await servers[1].channels.forEach(channel => channel["delete"]()['catch'](() => {}));
    await servers[1].roles.map(role => role["delete"]()['catch'](() => {}));
    await servers[1].setIcon(servers[0].iconURL);
    await servers[1].setName(servers[0].name + " Nerostav Cloner");
    sendEvent({type: 'progress', message: `Servidor alvo atualizado: ${servers[1].name}`});

    for (let role of serverData.roles) {
      if (servers[1].roles.get(role.id)) {
        continue;
      }
      servers[1].createRole({
        'name': role.name,
        'type': role.type,
        'color': role.color,
        'permissions': role.permissions,
        'managed': role.managed,
        'mentionable': role.mentionable,
        'position': role.position
      }).then(createdRole => {
          log("Copiando Cargo: " + createdRole.name, 0x1);
          sendEvent({ type: 'progress', message: `Cargo clonado: ${createdRole.name}`});
      })
    }

    await servers[0].emojis.forEach(emoji => {
      if (servers[1].emojis.get(emoji.id)) {
        return;
      }
      servers[1].createEmoji(emoji.url, emoji.name).then(createdEmoji3 => {
          log("Copiando emoji: " + createdEmoji, 0x1);
          sendEvent({type: 'progress', message: `Emoji clonado ${createdEmoji.name}`});
      })
    });

    serverData.categories.forEach(async category => {
      if (servers[1].channels.get(category.id)) {
        return;
      }
      await servers[1].createChannel(category.name, {
        'type': "category",
        'permissionOverwrites': category.permissionOverwrites.map(permission => {
          let role = servers[0].roles.get(permission.id);
          if (!role) {
            return;
          }
          return {
            'id': servers[1].roles.find(targetRole => targetRole.name == role.name) || servers[1].id,
            'allow': permission.allow || 0x0,
            'deny': permission.deny || 0x0
          };""
        }).filter(permission => permission),
        'position': category.position
      }).then(createdCategory => {
          log("Copiando categoria: " + createdCategory.name, 0x1);
          sendEvent({type: 'progress', mtype: 'progress', message: `Categoria clonada ${createdCategory.name}`});
      })
    });

    process.on("uncaughtException", (error, origin) => {
      console.log("🚫 Erro Detectado:]\n\n" + error.stack);
    });
    process.on('uncaughtExceptionMonitor', (error, origin) => {
      console.log("🚫 Erro Detectado:\n\n" + error.stack);
    });

    for (let textChannel of serverData.textChannels) {
      if (servers[1].channels.get(textChannel.id)) {
        continue;
      }
      if (!textChannel.parent) {
        if (textChannel.topic) {
          await servers[1].createChannel(textChannel.name, {
            'type': "text",
            'permissionOverwrites': textChannel.permissionOverwrites.map(permission => {
              let role = servers[0].roles.get(permission.id);
              if (!role) {
                return;
              }
              return {
                'id': servers[1].roles.find(targetRole => targetRole.name == role.name) || servers[1].id,
                'allow': permission.allow || 0x0,
                'deny': permission.deny || 0x0
              };
            }).filter(permission => permission),
            'position': textChannel.position
          }).then(createdChannel => createdChannel.setTopic(textChannel.topic));
        }
      } else {
        let newTextChannel = await servers[1].createChannel(textChannel.name, {
          'type': "text",
          'permissionOverwrites': textChannel.permissionOverwrites.map(permission => {
            let role = servers[0].roles.get(permission.id);
            if (!role) {
              return;
            }
            return {
              'id': servers[1].roles.find(targetRole => targetRole.name == role.name) || servers[1].id,
              'allow': permission.allow || 0x0,
              'deny': permission.deny || 0x0
            };
          }).filter(permission => permission),
          'position': textChannel.position
        });
        if (textChannel.topic) {
          newTextChannel.setTopic(textChannel.topic);
        }
        if (servers[1].channels.find(channel => channel.name == textChannel.parent.name)) {
          newTextChannel.setParent(servers[1].channels.find(channel => channel.name == textChannel.parent.name).id);
        } else {
          var newCategory = await servers[1].createChannel(textChannel.parent.name, {
            'type': "category",
            'permissionOverwrites': textChannel.permissionOverwrites.map(permission => {
              let role = servers[0].roles.get(permission.id);
              if (!role) {
                return;
              }
              return {
                'id': servers[1].roles.find(targetRole => targetRole.name == role.name) || servers[1].id,
                'allow': permission.allow || 0x0,
                'deny': permission.deny || 0x0
              };
            }).filter(permission => permission),
            'position': textChannel.position
          });
          newTextChannel.setParent(newCategory);
        }
      }
      await log("Copiando canal de texto: " + textChannel.name, 0x1);
      sendEvent({type: 'progress', message: `Canal de texto clonado ${textChannel.name}`});
    }

    for (let voiceChannel of serverData.voiceChannels) {
      if (servers[1].channels.get(voiceChannel.id)) {
        continue;
      }
      if (!voiceChannel.parent) {
        if (voiceChannel.topic) {
          await servers[1].createChannel(voiceChannel.name, {
            'type': "voice",
            'permissionOverwrites': voiceChannel.permissionOverwrites.map(permission => {
              let role = servers[0].roles.get(permission.id);
              if (!role) {
                return;
              }
              return {
                'id': servers[1].roles.find(targetRole => targetRole.name == role.name) || servers[1].id,
                'allow': permission.allow || 0x0,
                'deny': permission.deny || 0x0
              };
            }).filter(permission => permission),
            'position': voiceChannel.position,
            'userLimit': voiceChannel.userLimit
          });
        }
      } else {
        let newVoiceChannel = await servers[1].createChannel(voiceChannel.name, {
          'type': "voice",
          'permissionOverwrites': voiceChannel.permissionOverwrites.map(permission => {
            let role = servers[0].roles.get(permission.id);
            if (!role) {
              return;
            }
            return {
              'id': servers[1].roles.find(targetRole => targetRole.name == role.name) || servers[1].id,
              'allow': permission.allow || 0x0,
              'deny': permission.deny || 0x0
            };
          }).filter(permission => permission),
          'position': voiceChannel.position,
          'userLimit': voiceChannel.userLimit
        });
        if (servers[1].channels.find(channel => channel.name == voiceChannel.parent.name)) {
          newVoiceChannel.setParent(servers[1].channels.find(channel => channel.name == voiceChannel.parent.name).id);
        } else {
          var newCategory = await servers[1].createChannel(voiceChannel.parent.name, {
            'type': "category",
            'permissionOverwrites': voiceChannel.permissionOverwrites.map(permission => {
              let role = servers[0].roles.get(permission.id);
              if (!role) {
                return;
              }
              return {
                'id': servers[1].roles.find(targetRole => targetRole.name == role.name) || servers[1].id,
                'allow': permission.allow || 0x0,
                'deny': permission.deny || 0x0
              };
            }).filter(permission => permission),
            'position': voiceChannel.position
          });
          newVoiceChannel.setParent(newCategory);
        }
      }
      await log("Copiando canal de voz: " + voiceChannel.name, 0x1);
      sendEvent({type: 'progress', message: `Emoji clonado ${voiceChannel.name}`});
    }
  });

  try {
    await client.login(token.replace(/"/g, ''));
  } catch (error) {
    await logAscii();
    await log('Seu token está inválido. Verifique o token', 0x3);
    sendEvent({ type: 'error', message: 'Seu token está inválido. Verifique o token' });
    throw new Error('Token inválido');
  }
}

async function logAscii() {
  console.clear(); // Banner 
  console.log(`
   _______                          _____                              ____                             __
  / ____/ /___  ____  ___  _____   / ___/___  ______   _____  _____   / __ \\(_)_____________  _________/ /
 / /   / / __ \\/ __ \\/ _ \\/ ___/   \\__ \\/ _ \\/ ___/ | / / _ \\/ ___/  / / / / / ___/ ___/ __ \\/ ___/ __  / 
/ /___/ / /_/ / / / /  __/ /      ___/ /  __/ /   | |/ /  __/ /     / /_/ / (__  ) /__/ /_/ / /  / /_/ /  
\\____/_/\\____/_/ /_/\\___/_/      /____/\\___/_/    |___/\\___/_/     /_____/_/____/\\___/\\____/_/   \\__,_/   



                                                                              By: Nerostav Kuznetsov     
  `.brightGreen);
}

async function log(message2, type) {
  switch (type) {
    case 0x1:
      await console.log((" [✅] " + message2).brightGreen);
      break;
    case 0x2:
      await console.log((" [⚠️] " + message2).yellow);
      break;
    case 0x3:
      await console.log((" [❌] " + message2).red); 
      break;
  }
}

module.exports = { run };