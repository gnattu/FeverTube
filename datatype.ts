interface FeverItem {
  id: number
  feed_id: number
  title: string
  author: string
  html: string
  url: string
  is_saved: number // boolean number
  is_read: number // boolean number
  created_on_time: number
}

interface FeverGroup {
  id: number
  title: string
}

interface FeverFeedGroup {
  group_id: number
  feed_ids: string
}

interface FeverResponse {
  api_version: number
  auth: number // boolean number
  last_refreshed_on_time: number
}

interface FeverUnreadIdResponse extends FeverResponse {
  unread_item_ids: string
}

interface FeverItemResponse extends FeverResponse {
  total_items: number
  items: FeverItem[]
}

interface FeverGroupResponse extends FeverResponse {
  groups: FeverGroup[]
  feeds_groups: FeverFeedGroup[]
}

interface MetubeDownloadRequest {
  url: string
  quality?: string | null // One of 'best', '1440', '1080', '720', '480', and 'audio'
  format?: string | null // One of 'mp4', 'm4a', 'mp3', 'opus', 'wav', 'thumbnail', 'any'
  folder?: string | null // Can only be relative path, or a absolute path that solves to the path set in the MeTube
  custom_name_prefix?: string | null // If specified, the filename will contain this prefix before the filename.
}

interface MetubeDownloadResponse {
  status: string
  msg?: string
}

interface DownloadTaskRequest {
  feverId: number
  taskOption: MetubeDownloadRequest
}

export type {
  FeverItem,
  FeverItemResponse,
  FeverUnreadIdResponse,
  FeverGroupResponse,
  FeverResponse,
  MetubeDownloadRequest,
  MetubeDownloadResponse,
  DownloadTaskRequest,
}
