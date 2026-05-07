import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isToday from 'dayjs/plugin/isToday';

dayjs.extend(customParseFormat);
dayjs.extend(isToday);
