/**
 * Simple Event Emitter for data changes
 * Allows components to be notified when data changes in SQLite
 */

type EventCallback = () => void;
type EventType =
  | 'months:changed'
  | 'expenses:changed'
  | 'templates:changed'
  | 'cards:changed'
  | 'purchases:changed';

class DataEventEmitter {
  private listeners: Map<EventType, Set<EventCallback>> = new Map();

  /**
   * Subscribe to an event
   */
  on(event: EventType, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        callbacks.delete(callback);
      }
    };
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: EventType): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('[DataEvents] Error in listener:', error);
        }
      });
    }
  }

  /**
   * Remove all listeners for an event
   */
  removeAllListeners(event?: EventType): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}

// Export singleton instance
export const dataEvents = new DataEventEmitter();
