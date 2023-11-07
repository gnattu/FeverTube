# FeverTube

CLI tool to automatically download YouTube videos from RSS feeds. It fetches unread items from RSS aggregators via the [Fever API](https://github.com/DigitalDJ/tinytinyrss-fever-plugin/blob/master/fever-api.md) and sends them to [Metube](https://github.com/alexta69/metube) for video downloads.

YouTube provides official RSS feeds for channels using the format `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`. However, these feeds are limited in the number of videos they provide. For more comprehensive RSS feeds, you can create a Google API key and utilize the YouTube Data API. Afterward, you can set up an instance of [RSSHub](https://docs.rsshub.app) to obtain better RSS feeds.

Several RSS feed aggregators have implemented the Fever API, including [Tiny Tiny RSS](https://tt-rss.org) and [Fresh RSS](https://freshrss.org/index.html). You can choose the one you prefer to use with this project.

## Usage

### CLI

```shell
Usage: fevertube [options] [command]

Options:
  -u, --user <user>                    Fever API username
  -p, --password <password>            Fever API password
  -f, --fever-api-url <fever-api-url>  The base URL of the Fever API
  -m, --metube-url <metube-url>        URL of Metube
  -g, --feed-groups <feed-groups>      Specify the feed groups you want to download, using comma-separated group IDs. By default, it downloads all unread items from
                                       all groups
  -o, --metube-option <metube-option>  MeTube download options in JSON string format
  -r, --refreshing-interval <seconds>  Poll for updates from feed sources at specific intervals (in seconds). FeverTube will continuously run in this mode to check
                                       for updates
  -h, --help                           display help for command

Commands:
  show-groups                          Show all RSS subscription groups
```

- The `-g, --feed-groups` option can specify a single group like `--feed-groups 1` or multiple groups like `--feed-groups 1,2,3`.

- The `<metube-option>` is a JSON string with properties defined by `MetubeDownloadRequest` in [datatype.ts](./datatype.ts). For example: `--metube-option '{"quality": "480" }'`

- Use the `show-groups` command to retrieve the feed group IDs from the RSS aggregator, allowing you to specify them with `-g, --feed-groups`.

### Caveats:

- Ensure that you include the part up to `?api` as the Fever API base URL. For example, use `http://freshrss.example.net/api/fever.php?api` if you are using Fresh RSS, and `http://ttrss.example.net/plugins/fever/?api` if you are using Tiny Tiny RSS.

- Due to MeTube's API limitations, the `quality` property of `<metube-option>` can only be one of `best`, `1440`, `1080`, `720`, `480`, and `audio`. Resolutions other than these options, such as 4K or 8K, cannot be specified.

- If you have multiple feed groups and do not specify `-g, --feed-groups` to only fetch YouTube-related feeds, this tool will send URLs from all unread feeds it get to MeTube, even if the URLs are not related to YouTube. This may result in undefined behaviors. However, `yt-dlp` does support sources other than YouTube, so you can try using this tool to download videos from other sources as well.

## Build and run

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run index.ts
```

To generate single binary executable:

```shell
bun run build
```

This project was created using `bun init` in bun v1.0.9. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
