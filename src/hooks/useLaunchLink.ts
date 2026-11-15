/**
 * Opens the channel asked for by a tvaovivo://canal link (src/services/launchLink.ts), whether the
 * link launched the app or arrived while it was open (NyxAndroidPlugin.takeLaunchLink, event
 * « launchLink »). Waits for the catalogue: the channel is looked up in the live list.
 */

import { useEffect, useRef } from 'react';
import { invoke, addPluginListener, type PluginListener } from '@tauri-apps/api/core';
import type { LightIndexes } from '../types/lightIndex';
import { liveTvLists } from '../services/liveTvLists';
import { findLaunchChannel, parseLaunchLink } from '../services/launchLink';
import { usePlayer } from '../contexts/PlayerContext';
import { isAndroid } from '../utils/platform';
import { createLogger } from '../utils/logger';

const log = createLogger('LaunchLink');
const PLUGIN = 'nyx-android';

export function useLaunchLink(lightIndexes: LightIndexes | null, showLive: () => void): void {
  const { play } = usePlayer();
  const latest = useRef({ lightIndexes, showLive, play });
  latest.current = { lightIndexes, showLive, play };
  const ready = !!lightIndexes;

  useEffect(() => {
    if (!ready || !isAndroid()) return;
    let cancelled = false;
    let listener: PluginListener | null = null;

    const take = async () => {
      let url: string | null = null;
      try {
        const result = await invoke<{ url?: string | null }>(`plugin:${PLUGIN}|take_launch_link`);
        url = result?.url ?? null;
      } catch (e) {
        log.warn('take_launch_link failed', e);
        return;
      }
      if (cancelled || !url) return;
      const request = parseLaunchLink(url);
      const { lightIndexes: indexes, showLive: show, play: playChannel } = latest.current;
      if (!request || !indexes) return;
      const channel = findLaunchChannel(liveTvLists(indexes).streams, request);
      show();
      if (channel) {
        log.info('Opening channel from link', channel.name);
        void playChannel(channel);
      } else {
        log.info('No channel matches the link', request);
      }
    };

    void take();
    addPluginListener(PLUGIN, 'launchLink', () => {
      void take();
    })
      .then((l) => {
        if (cancelled) void l.unregister();
        else listener = l;
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (listener) void listener.unregister();
    };
  }, [ready]);
}
