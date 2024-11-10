import { CommandType, commandModule } from "@sern/handler";
import puppeteer from "puppeteer";

export default commandModule({
  type: CommandType.Both, // Ensure this is appropriate for your command
  description: "Displays the closest upcoming Meetup event",
  execute: async (ctx, args) => {
    const MEETUP_URL = "https://www.meetup.com/montana-programmers/events/";

    try {
      // Defer the reply immediately to avoid interaction timeout
      await ctx.interaction.deferReply(); // Use deferReply from the interaction object

      console.log(`Launching browser to fetch events from ${MEETUP_URL}`);
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(MEETUP_URL, { waitUntil: "networkidle0" });
      await page.waitForSelector('div[id^="e-"]', { timeout: 5000 });
      console.log("Page loaded successfully");

      const events = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('div[id^="e-"]');
        console.log(`Found ${eventElements.length} event elements`);

        const events = [];

        eventElements.forEach((element) => {
          const titleElement = element.querySelector("span.ds-font-title-3");
          const dateElement = element.querySelector("time");
          const linkElement = element.querySelector('a[href*="/events/"]');

          const title = titleElement ? titleElement.textContent.trim() : "";
          const dateText = dateElement ? dateElement.textContent.trim() : "";
          
          const link = linkElement ? linkElement.href : "";

          console.log(`Event found: title=${title}, dateText=${dateText}, link=${link}`);

          if (title && dateText && link) {
            events.push({ title, dateText, link });
          }
        });

        return events;
      });

      await browser.close();
      console.log(`Total events found: ${events.length}`);

      if (events.length === 0) {
        await ctx.interaction.editReply("No upcoming events.");
      } else {
        // Get the closest event (assuming the first one is the closest)
        const closestEvent = events[0];

        console.log("Closest event:", closestEvent);

        const message = `**${closestEvent.title}**\nDate: ${closestEvent.dateText}\nLink: ${closestEvent.link}\n\n`;
        await ctx.interaction.editReply(message);
      }
    } catch (error) {
      console.error("An error occurred:", error);
      // Attempt to reply with an error message
      try {
        await ctx.interaction.editReply("An error occurred while fetching events.");
      } catch (replyError) {
        console.error("Failed to send error reply:", replyError);
      }
    }
  },
});