import RequestType from '../enums/RequestType';
import { uuidv4 } from '../utilities';
class RequestPoolManager {
    constructor(id) {
        this.numRequests = {
            interaction: 0,
            thumbnail: 0,
            prefetch: 0,
        };
        this.id = id ? id : uuidv4();
        this.requestPool = {
            interaction: { 0: [] },
            thumbnail: { 0: [] },
            prefetch: { 0: [] },
        };
        this.grabDelay = 5;
        this.awake = false;
        this.numRequests = {
            interaction: 0,
            thumbnail: 0,
            prefetch: 0,
        };
        this.maxNumRequests = {
            interaction: 6,
            thumbnail: 6,
            prefetch: 5,
        };
    }
    setMaxSimultaneousRequests(type, maxNumRequests) {
        this.maxNumRequests[type] = maxNumRequests;
    }
    getMaxSimultaneousRequests(type) {
        return this.maxNumRequests[type];
    }
    destroy() {
        if (this.timeoutHandle) {
            window.clearTimeout(this.timeoutHandle);
        }
    }
    addRequest(requestFn, type, additionalDetails, priority = 0) {
        const requestDetails = {
            requestFn,
            type,
            additionalDetails,
        };
        if (this.requestPool[type][priority] === undefined) {
            this.requestPool[type][priority] = [];
        }
        this.requestPool[type][priority].push(requestDetails);
        if (!this.awake) {
            this.awake = true;
            this.startGrabbing();
        }
        else if (type === RequestType.Interaction) {
            this.startGrabbing();
        }
    }
    filterRequests(filterFunction) {
        Object.keys(this.requestPool).forEach((type) => {
            const requestType = this.requestPool[type];
            Object.keys(requestType).forEach((priority) => {
                requestType[priority] = requestType[priority].filter((requestDetails) => {
                    return filterFunction(requestDetails);
                });
            });
        });
    }
    clearRequestStack(type) {
        if (!this.requestPool[type]) {
            throw new Error(`No category for the type ${type} found`);
        }
        this.requestPool[type] = { 0: [] };
    }
    sendRequests(type) {
        const requestsToSend = this.maxNumRequests[type] - this.numRequests[type];
        for (let i = 0; i < requestsToSend; i++) {
            const requestDetails = this.getNextRequest(type);
            if (requestDetails === null) {
                return false;
            }
            else if (requestDetails) {
                this.numRequests[type]++;
                this.awake = true;
                requestDetails.requestFn().finally(() => {
                    this.numRequests[type]--;
                    this.startAgain();
                });
            }
        }
        return true;
    }
    getNextRequest(type) {
        const interactionPriorities = this.getSortedPriorityGroups(type);
        for (const priority of interactionPriorities) {
            if (this.requestPool[type][priority].length) {
                return this.requestPool[type][priority].shift();
            }
        }
        return null;
    }
    startGrabbing() {
        const hasRemainingInteractionRequests = this.sendRequests(RequestType.Interaction);
        const hasRemainingThumbnailRequests = this.sendRequests(RequestType.Thumbnail);
        const hasRemainingPrefetchRequests = this.sendRequests(RequestType.Prefetch);
        if (!hasRemainingInteractionRequests &&
            !hasRemainingThumbnailRequests &&
            !hasRemainingPrefetchRequests) {
            this.awake = false;
        }
    }
    startAgain() {
        if (!this.awake) {
            return;
        }
        if (this.grabDelay !== undefined) {
            if (!this.timeoutHandle) {
                this.timeoutHandle = window.setTimeout(() => {
                    this.timeoutHandle = null;
                    this.startGrabbing();
                }, this.grabDelay);
            }
        }
        else {
            this.startGrabbing();
        }
    }
    getSortedPriorityGroups(type) {
        const priorities = Object.keys(this.requestPool[type])
            .map(Number)
            .filter((priority) => this.requestPool[type][priority].length)
            .sort();
        return priorities;
    }
    getRequestPool() {
        return this.requestPool;
    }
}
const requestPoolManager = new RequestPoolManager();
export { RequestPoolManager };
export default requestPoolManager;
//# sourceMappingURL=requestPoolManager.js.map