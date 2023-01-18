import { prisma } from './lib/prisma';
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import dayjs from 'dayjs';

export async function appRoutes(app: FastifyInstance) {
	app.post('/habits', async (request) => {
		const createHabitBOdy = z.object({
			title: z.string(),
			weekDays: z.array(z.number().int().min(0).max(6)),
		});

		const { title, weekDays } = createHabitBOdy.parse(request.body);
		const today = dayjs().startOf('day').toDate();

		await prisma.habit.create({
			data: {
				title,
				created_at: today,
				weekDays: {
					create: weekDays.map((weekDay) => {
						return {
							week_day: weekDay,
						};
					}),
				},
			},
		});
	});

	app.get('/day', async (request) => {
		const getDayParams = z.object({
			date: z.coerce.date(),
		});

		const { date } = getDayParams.parse(request.query);
		const parsetDate = dayjs(date).startOf('day');
		const week_day = parsetDate.get('day');

		const possibleHabits = await prisma.habit.findMany({
			where: {
				created_at: {
					lte: date,
				},
				weekDays: {
					some: {
						week_day: week_day,
					},
				},
			},
		});

		const day = await prisma.day.findUnique({
			where: {
				date: parsetDate.toDate(),
			},
			include: {
				dayHabits: true,
			},
		});

		const completedHabits = day?.dayHabits.map((dayHabit) => {
			return dayHabit.habit_id;
		});

		return {
			possibleHabits,
			completedHabits,
		};
	});
}
