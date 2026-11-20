/**
 * Per-Phone FIFO Serialization Queue
 * Ensures incoming WhatsApp messages from the same user are processed sequentially
 * in strict arrival order, eliminating race conditions and out-of-order replies.
 */

type QueueTask<T> = () => Promise<T>;

class PhoneSerialQueue {
  private queues = new Map<string, Promise<any>>();

  /**
   * Enqueues a task for a specific phone number.
   * Runs strictly after any previously enqueued task for this phone number completes.
   */
  async enqueue<T>(phone: string, task: QueueTask<T>): Promise<T> {
    const cleanPhone = phone.trim();
    const previousPromise = this.queues.get(cleanPhone) || Promise.resolve();

    let taskResult: T;
    let taskError: any = null;

    const currentPromise = previousPromise
      .catch(() => {}) // Don't let previous failures reject current task
      .then(async () => {
        try {
          taskResult = await task();
        } catch (err) {
          taskError = err;
        }
      })
      .finally(() => {
        // If this is the last task in the chain, clean up the map entry
        if (this.queues.get(cleanPhone) === currentPromise) {
          this.queues.delete(cleanPhone);
        }
      });

    this.queues.set(cleanPhone, currentPromise);

    await currentPromise;

    if (taskError) {
      throw taskError;
    }

    return taskResult!;
  }

  /**
   * Diagnostic helper: returns the number of active phone queues currently processing.
   */
  getActiveQueueCount(): number {
    return this.queues.size;
  }
}

export const phoneSerializationQueue = new PhoneSerialQueue();

