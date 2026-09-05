import express, { type Express, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import { sendCommonEmail } from './services/email.ts';

const app = express();
const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_URI as string)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.get('/', (req: Request, res: Response) => {
  res.send('Hello World!');
});

app.listen(port, async () => {
  console.log(`Aramyaw API listening on port ${port}`);

  await sendCommonEmail(
    ['jhonreymendiola@gmail.com'],
    'Aramyaw Test Email',
    '<h1>Hello from Aramyaw!</h1>'
  );
});