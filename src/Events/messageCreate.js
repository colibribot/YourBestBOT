const { PermissionFlagsBits, TextChannel, EmbedBuilder } = require("discord.js");
const Schema = require("../schemas/stats.js");
const { sticky } = require("../functions/sticky.js");
const { stealEmoji } = require("../functions/stealEmoji.js");

module.exports = {
	name: "messageCreate",
	commandsArr: ["steal"],
	async execute(message, client) {
		if (client.user.id == message.author.id) return;
		sticky(message);
		if (message.author.bot) return;
		let data = await Schema.findOne()
		if (!data) {
			data = await Schema.create({
				NMessages: 1,
				NUsedCmd: 0
			})
			console.log("something went wrong when trying tog get bot stats");
		}
		data.NMessages = data.NMessages + 1;
		await data.save();
		const prefix = "+";
		const args = message.content.slice(prefix.length).trim().split(/ +/);
		const command = args.shift().toLowerCase();
		detect(message);
		if (command === 'steal') {
			if (!(message.member.permissions.has(PermissionFlagsBits.ManageGuildExpressions))) return message.channel.send({ content: `You don't have the required permissions to run this command.` }).then((msg) => { setTimeout(() => { msg.delete(); }, 5 * 1000); })
			stealEmoji(message, args);
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
				if (linkedChannel && linkedChannel instanceof TextChannel) {
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
					if (linkedMessage.embeds.length > 0)
					{
						obj.embeds.push(footerEmbed);
						obj.embeds.push(linkedMessage.embeds[0]);
					} else
						obj.embeds.push(authorEmbed);
					console.log(obj.embeds);
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
