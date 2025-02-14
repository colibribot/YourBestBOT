const { TextChannel, EmbedBuilder, ChannelType } = require("discord.js");
const Schema = require("../schemas/stats.js");
const UserStats = require("../schemas/userStats.js");
const { sticky } = require("../functions/sticky.js");
const { WBlacklist } = require('../functions/WBlacklist.js');
const { ticketsChannelsID } = require('../functions/ticketSys.js');
const { getTimestamp } = require('../functions/utils.js');

module.exports = {
	name: "messageCreate",
	commandsArr: ["steal"],
	async execute(message, client) {
		if (client.user.id == message.author.id) return;
		sticky(message);
		WBlacklist(message);
		if (ticketsChannelsID[message.channel.id]) {
			ticketsChannelsID[message.channel.id].push({
				id: message.id,
				author: message.author.tag,
				authorId: message.member.id,
				avatar: message.author.displayAvatarURL({ dynamic: true, size: 512 }),
				content: message.content,
				reference: message.reference ? message.reference.messageId : null,
				attachments: message.attachments ? [...Array.from(message.attachments.values()).map((attachment) => attachment.url)] : null,
				guildIcon: message.guild.iconURL({ dynamic: true, size: 512 }),
				timestamp: getTimestamp()
			})
		}
		if (message.author.bot) return;

		if (message.guild.id == "702545447750860931" || message.guild.id == "1054090158779150376" || message.guild.id == '946518364216520774')
			detect(message);

		let data = await Schema.findOne()
		if (!data) {
			data = await Schema.create({
				NMessages: 1,
				NUsedCmd: 0
			})
			console.log("something went wrong when trying tog get bot stats");
		}
		if (!data.servers) {
			data.servers = {
				total: client.guilds.cache.size,
				current: client.guilds.cache.size,
				last: 0,
				diff: client.guilds.cache.size
			}
		}
		data.NMessages = data.NMessages + 1;
		await data.save();

		let userData = await UserStats.findOne({ UserId: message.author.id });
		if (!userData) {
			userData = await UserStats.create({
				User: message.author.username,
				UserId: message.author.id,
				Avatar: message.author.avatar,
				Banner: message.author.banner || "",
				Messages: 0,
				CmdCount: 0,
				Votes: {
					count: 0
				},
				isVoter: false
			})
		}
		if (userData.isVoter == null) userData.isVoter = false;
		if (userData.Avatar != message.author.avatar) userData.Avatar = message.author.avatar;
		userData.Messages = userData.Messages + 1;
		await userData.save();

		const PREFIXES = ["+", "ybb"];
		const prefix = PREFIXES.find((prefix) => {
			if (message.content.toLowerCase().startsWith(prefix)) return true;
			// Check if the prefix is separated by a space
			const words = message.content.toLowerCase().split(' ');
			return words.length > 1 && words[0] === prefix.toLowerCase();
		}) || `<@!${client.user.id}>` || `<@${client.user.id}>`;
		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const commandName = args.shift().toLowerCase();

		const command = client.prefixCmds.get(commandName) || client.prefixCmds.find(cmd => cmd.alias && cmd.alias.includes(commandName));

		if (!command) return;

		if (command.developer && !message.client.config.Devs.includes(message.author.id))
			return message.reply('This command is for Devs only. \<3');

		try {
			command.execute(message, args);
		} catch (err) {
			console.error(err);
			message.channel.send('There was an error executing that command!');
		}
	},
};

async function detect(message) {
	const messageLinkRegex = /https:\/\/discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
	const match = message.content.match(messageLinkRegex);
	if (match) {
		const [, serverId, channelId, messageId] = match;

		// Ensure the linked message is within the same server
		if (serverId === message.guild.id) {
			try {
				const linkedChannel = message.guild.channels.cache.get(channelId);
				if (linkedChannel && (linkedChannel instanceof TextChannel || linkedChannel.type === ChannelType.GuildAnnouncement)) {
					const linkedMessage = await linkedChannel.messages.fetch(messageId);
					//console.log(linkedMessage);

					const authorEmbed = new EmbedBuilder()
						.setAuthor({ name: linkedMessage.author.globalName, iconURL: linkedMessage.author.avatarURL() })
						.setColor(message.guild.members.me.displayHexColor)

					const footerEmbed = new EmbedBuilder()
						.setFooter({ text: linkedMessage.author.bot ? `@${linkedMessage.author.username}` : `@${linkedMessage.author.globalName}`, iconURL: linkedMessage.author.avatarURL() })
						.setColor(message.guild.members.me.displayHexColor)

					const obj = {
						embeds: [],
					}

					// for gifs add just the first frame to the image and the link of the video to the description
					if (linkedMessage.content)
						authorEmbed.setDescription(linkedMessage.content);
					if (linkedMessage.attachments.size > 0)
						authorEmbed.setImage(`${linkedMessage.attachments.first().url}`)
					if (linkedMessage.embeds.length > 0) {
						obj.embeds.push(footerEmbed);
						obj.embeds.push(linkedMessage.embeds[0]);
					} else
						obj.embeds.push(authorEmbed);
					//message.reply(`Content of the linked message: ${linkedMessage.content}`, { allowedMentions: { repliedUser: false } });
					return message.reply(obj, { mention: false });
				} else {
					message.reply('The linked channel is not accessible or is not a text channel.');
				}
			} catch (error) {
				console.error('Error fetching linked message:', error);
			}
		}
	}
}

