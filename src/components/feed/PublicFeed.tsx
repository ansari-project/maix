"use client"

import { FeedContainer } from "./FeedContainer"

export function PublicFeed() {
  return <FeedContainer isPublic={true} showHeader={false} />
}