import eventsRepository from '../../modules/events/events.repository';
import { BadRequestError } from '../errors';

const getCurrentEvent = async () => {
    const event = await eventsRepository.getCurrentEvent();

    if (!event) {
        throw new BadRequestError('No active event found. Please activate an event first.');
    }

    return event;
};

export default { getCurrentEvent };
