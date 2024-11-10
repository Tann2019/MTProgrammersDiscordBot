import { CommandType, commandModule } from "@sern/handler";
var ping_default = commandModule({
  type: CommandType.Both,
  plugins: [],
  //optional
  description: "A ping command",
  //alias : [],
  execute: async (ctx, args) => {
    await ctx.reply("Pong \u{1F3D3} im craazy");
  }
});
export {
  ping_default as default
};
