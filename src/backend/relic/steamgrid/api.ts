import axios from 'axios'
import { SGDBGame, SGDBGrid } from 'common/types'
import { relicUserAgent } from 'backend/constants/others'

const SGDB_API_URL = 'https://www.steamgriddb.com/api/v2'

interface SGDBResponse<T> {
  success: boolean
  data: T
  errors?: string[]
}

const userAgent = relicUserAgent

function headers(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'User-Agent': userAgent
  }
}

export async function searchGame(
  apiKey: string,
  query: string
): Promise<SGDBGame[]> {
  const response = await axios.get<SGDBResponse<SGDBGame[]>>(
    `${SGDB_API_URL}/search/autocomplete/${encodeURIComponent(query)}`,
    { headers: headers(apiKey) }
  )

  if (!response.data.success) {
    throw new Error(response.data.errors?.join(', ') || 'Search failed')
  }

  return response.data.data
}

export async function getGrids(
  apiKey: string,
  args: { gameId: number; dimensions?: string[] }
): Promise<SGDBGrid[]> {
  const params: Record<string, string> = {}
  if (args.dimensions?.length) {
    params.dimensions = args.dimensions.join(',')
  }

  const response = await axios.get<SGDBResponse<SGDBGrid[]>>(
    `${SGDB_API_URL}/grids/game/${args.gameId}`,
    { params, headers: headers(apiKey) }
  )

  if (!response.data.success) {
    throw new Error(response.data.errors?.join(', ') || 'Failed to get grids')
  }

  return response.data.data
}

export async function getHeroes(
  apiKey: string,
  args: { gameId: number }
): Promise<SGDBGrid[]> {
  const response = await axios.get<SGDBResponse<SGDBGrid[]>>(
    `${SGDB_API_URL}/heroes/game/${args.gameId}?limit=1`,
    { headers: headers(apiKey) }
  )

  if (!response.data.success) {
    throw new Error(response.data.errors?.join(', ') || 'Failed to get heroes')
  }

  return response.data.data
}

export async function getLogos(
  apiKey: string,
  args: { gameId: number }
): Promise<SGDBGrid[]> {
  const response = await axios.get<SGDBResponse<SGDBGrid[]>>(
    `${SGDB_API_URL}/logos/game/${args.gameId}?limit=1`,
    { headers: headers(apiKey) }
  )

  if (!response.data.success) {
    throw new Error(response.data.errors?.join(', ') || 'Failed to get logos')
  }

  return response.data.data
}

export async function getIcons(
  apiKey: string,
  args: { gameId: number }
): Promise<SGDBGrid[]> {
  const response = await axios.get<SGDBResponse<SGDBGrid[]>>(
    `${SGDB_API_URL}/icons/game/${args.gameId}?limit=1`,
    { headers: headers(apiKey) }
  )

  if (!response.data.success) {
    throw new Error(response.data.errors?.join(', ') || 'Failed to get icons')
  }

  return response.data.data
}
