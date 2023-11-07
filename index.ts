import { program } from 'commander'

import {
  MetubeDownloadRequest,
  MetubeDownloadResponse,
  DownloadTaskRequest,
  FeverItemResponse,
  FeverUnreadIdResponse,
  FeverGroupResponse,
  FeverResponse,
} from './datatype'

import { logTable } from './util'

program
  .name('fevertube')
  .addHelpCommand(false)
  .requiredOption('-u, --user <user>', 'Fever API username')
  .requiredOption('-p, --password <password>', 'Fever API password')
  .requiredOption('-f, --fever-api-url <fever-api-url>', 'The base URL of the Fever API')
  .option('-m, --metube-url <metube-url>', 'URL of Metube')
  .option(
    '-g, --feed-groups <feed-groups>',
    'Specify the feed groups you want to download, using comma-separated group IDs. By default, it downloads all unread items from all groups',
  )
  .option('-o, --metube-option <metube-option>', 'MeTube download options in JSON string format')
  .option(
    '-r, --refreshing-interval <seconds>',
    'Poll for updates from feed sources at specific intervals (in seconds). FeverTube will continuously run in this mode to check for updates',
  )
  // Empty hanlder to force default behavior to no-subcommand
  .action(async () => {})
  .command('show-groups')
  .description('Show all RSS subscription groups')
  .action(async () => {
    const options = program.opts()
    const authData = new URLSearchParams()
    authData.append(
      'api_key',
      new Bun.CryptoHasher('md5').update(`${options.user}:${options.password}`).digest('hex'),
    )
    try {
      const unreadRes = await fetch(`${options.feverApiUrl}&groups`, {
        method: 'POST',
        body: authData,
      })
      if (!unreadRes.ok) {
        throw new Error(`ERROR: HTTP CODE ${unreadRes.status}`)
      }
      const resJson: FeverGroupResponse = await unreadRes.json()
      if (resJson.groups === null || resJson.groups === undefined) {
        throw new Error('Fever API does not return any groups')
      }
      logTable(resJson.groups)
      process.exit(0)
    } catch (e) {
      console.error(e)
      process.exit(1)
    }
  })
await program.parseAsync(Bun.argv)
const { user, password, feverApiUrl, metubeUrl, feedGroups, metubeOption, refreshingInterval } =
  program.opts()

if (!metubeUrl) {
  console.error('ERROR: MeTube URL cannot be empty')
  process.exit(1)
}

const API_KEY: string = new Bun.CryptoHasher('md5').update(`${user}:${password}`).digest('hex')
const API_BASE: string = feverApiUrl
const METUBE_URL: string = metubeUrl
const DOWNLOAD_ALL_UNREAD_FEEDS = !feedGroups
const DOWNLOAD_FEED_GROUPS: number[] = DOWNLOAD_ALL_UNREAD_FEEDS
  ? []
  : feedGroups.split(',').map((x: string) => Number(x))
const AUTH_DATA = new URLSearchParams()
AUTH_DATA.append('api_key', API_KEY)

const DOWNLOAD_OPTION = metubeOption ? JSON.parse(metubeOption) : {}
const REFRESHING_INTERVAL: number = refreshingInterval ? Number(refreshingInterval) : 0

// Caller should handle the case where auth === 0 and api_version < 0
// In such cases, the response may not contain all properties of the response type.
const fetchFeverApi = async <T>(endpoint: string): Promise<T> => {
  try {
    const unreadRes = await fetch(`${API_BASE}&${endpoint}`, {
      method: 'POST',
      body: AUTH_DATA,
    })
    if (!unreadRes.ok) {
      throw new Error(`ERROR: HTTP CODE ${unreadRes.status}`)
    }
    const resJson: T = await unreadRes.json()
    return resJson
  } catch (e) {
    console.error(e)
    return {
      api_version: -1,
      auth: 0, // boolean number
      last_refreshed_on_time: -1,
    } as T
  }
}

const postDownloadTask = async (task: MetubeDownloadRequest): Promise<boolean> => {
  try {
    const res = await fetch(`${METUBE_URL}/add`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify(task),
    })
    if (!res.ok) {
      throw new Error(`ERROR: HTTP CODE ${res.status}`)
    }
    const resJson: MetubeDownloadResponse = await res.json()
    if (resJson.status === 'error') {
      throw new Error(`ERROR: ${resJson.msg}`)
    }
    return true
  } catch (e) {
    console.error(`ERROR: Task with url ${task.url} failed to add.`)
    console.error(e)
    return false
  }
}

const getDownloadFeedIds = async (): Promise<number[]> => {
  const downloadFeedIds: number[] = []
  const feverGroupRes: FeverGroupResponse = await fetchFeverApi('groups')
  if (feverGroupRes.auth === 0) return downloadFeedIds
  feverGroupRes.feeds_groups
    .filter((fg) => DOWNLOAD_ALL_UNREAD_FEEDS || DOWNLOAD_FEED_GROUPS.includes(fg.group_id))
    .forEach((fg) => {
      fg.feed_ids.split(',').forEach((id) => {
        downloadFeedIds.push(Number(id))
      })
    })
  return downloadFeedIds
}

const fetchAndGenerateDownloadTasks = async (): Promise<DownloadTaskRequest[]> => {
  const downloadTaskRequests: DownloadTaskRequest[] = []
  const downloadFeedIds = await getDownloadFeedIds()
  const unreadItemsRes: FeverUnreadIdResponse = await fetchFeverApi('unread_item_ids')
  if (unreadItemsRes.auth === 0) return downloadTaskRequests
  const unreadItems = unreadItemsRes.unread_item_ids
  const itemIdArray = unreadItems.split(',')
  // Because fever api only allows up to 50 items per query
  const itemIdGroups = groupItems(itemIdArray)
  for (const group of itemIdGroups) {
    const itemDetailRes: FeverItemResponse = await fetchFeverApi(
      `&items&with_ids=${group.join(',')}`,
    )
    if (itemDetailRes.auth === 0) continue
    itemDetailRes.items
      .filter((x) => downloadFeedIds.includes(x.feed_id))
      .forEach((x) => {
        downloadTaskRequests.push({
          feverId: x.id,
          taskOption: { url: x.url, quality: 'best', ...DOWNLOAD_OPTION },
        })
      })
  }
  return downloadTaskRequests
}

const markFeverItemRead = async (id: number) => {
  const res: FeverResponse = await fetchFeverApi(`mark=item&as=read&id=${id}`)
  if (res.auth === 0) {
    console.warn(`Fever item with ${id} does not mark as read successfully`)
  }
}

const submitDownloadTasks = async (tasks: DownloadTaskRequest[]) => {
  for (const task of tasks) {
    // eslint-disable-next-line no-console
    console.log(`Submitting download task ${task.taskOption.url}`)
    const posted = await postDownloadTask(task.taskOption)
    if (posted) {
      await markFeverItemRead(task.feverId)
    }
  }
}

const groupItems = (array: string[]): string[][] => {
  const groups: string[][] = []
  for (let i = 0; i < array.length; i += 50) {
    groups.push(array.slice(i, i + 50))
  }
  return groups
}

if (REFRESHING_INTERVAL > 0) {
  for (;;) {
    const tasks = await fetchAndGenerateDownloadTasks()
    await submitDownloadTasks(tasks)
    await Bun.sleep(REFRESHING_INTERVAL * 1000)
  }
} else {
  const tasks = await fetchAndGenerateDownloadTasks()
  await submitDownloadTasks(tasks)
}
