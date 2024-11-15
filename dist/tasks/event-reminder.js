// event-reminder.js
import { scheduledTask } from '@sern/handler';
import { client } from '../index.js'; // Adjust the path to your main bot file
import puppeteer from 'puppeteer';

const announcedEvents = new Set();

export default scheduledTask({
  trigger: '*/30 * * * *', // Run every minute
  execute: async () => {
    try {
      if (!client.isReady()) {
        console.log('Client is not ready yet.');
        return;
      }

      const MEETUP_URL = 'https://www.meetup.com/montana-programmers/events/';
      const CHANNELS = {
        Billings: 'YOUR_BILLINGS_CHANNEL_ID',
        Bozeman: 'YOUR_BOZEMAN_CHANNEL_ID',
        // Add more locations and their corresponding channel IDs here
      };

      console.log(`Launching browser to fetch events from ${MEETUP_URL}`);
      const browser = await puppeteer.launch({ headless: true });
      const page = await browser.newPage();

      await page.goto(MEETUP_URL, { waitUntil: 'networkidle0' });
      await page.waitForSelector('div[id^="e-"]', { timeout: 5000 });
      console.log('Page loaded successfully');

      const events = await page.evaluate(() => {
        const eventElements = document.querySelectorAll('div[id^="e-"]');
        const events = [];

        eventElements.forEach((element) => {
          const titleElement = element.querySelector('span.ds-font-title-3');
          const dateElement = element.querySelector('time');
          const linkElement = element.querySelector('a[href*="/events/"]');

          const title = titleElement ? titleElement.textContent.trim() : '';
          const dateText = dateElement ? dateElement.textContent.trim() : '';
          const link = linkElement ? linkElement.href : '';

          if (title && dateText && link) {
            events.push({ title, dateText, link });
          }
        });

        return events;
      });

      await browser.close();

      if (events.length === 0) {
        console.log('No upcoming events found.');
        return;
      }

      const now = new Date();

      // Time boundaries for the 10-minute window 24 hours before the event
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      const tenMinutesInMs = 10 * 60 * 1000;
      const lowerBound = twentyFourHoursInMs - tenMinutesInMs;
      const upperBound = twentyFourHoursInMs;

      // Filter events happening in the 10-minute window 24 hours from now
      const upcomingEvents = events.filter((event) => {
        const eventDate = new Date(event.dateText);
        const timeDifference = eventDate - now;
        return timeDifference >= lowerBound && timeDifference <= upperBound;
        //return timeDifference > 0;  --Debugging
      });

      if (upcomingEvents.length === 0) {
        console.log('No events happening within the next 24 hours window.');
        return;
      }

      // For each upcoming event, post in the appropriate channel if not already posted
      for (const event of upcomingEvents) {
        if (announcedEvents.has(event.link)) {
          // Event has already been announced
          continue;
        }

        let location = null;
        if (event.title.includes('Billings')) {
          location = 'Billings';
        } else if (event.title.includes('Bozeman')) {
          location = 'Bozeman';
        }
        // Add more location checks as needed

        if (location && CHANNELS[location]) {
          const channelId = CHANNELS[location];
          const channel = await client.channels.fetch(channelId);

          if (channel?.isTextBased()) {
            const message = `**${event.title}**\nDate: ${event.dateText}\nLink: ${event.link}`;
            await channel.send(message);
            console.log(`Posted event to ${location} channel: ${event.title}`);
            // Add the event to the announcedEvents set
            announcedEvents.add(event.link);
          } else {
            console.warn(`Channel not found or not text-based for location: ${location}`);
          }
        } else {
          console.warn(`No channel configured for event location: ${location}`);
        }
      }
    } catch (error) {
      console.error('An error occurred while checking events:', error);
    }
  },
});