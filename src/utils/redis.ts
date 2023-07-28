import { createClient } from "redis";
import settingCrons from "./jobs/setCrons";

const redisConnectionStart = async () => {

  const redisClient = createClient();

  redisClient.on("error", (err) => console.log("Redis Client Error", err));

  await redisClient.connect();

  settingCrons();

  return redisClient;
}

export default redisConnectionStart;


// const cacheResults = await redisClient.get(species);
    //   results = JSON.parse(cacheResults)
    //   await redisClient.set(species, JSON.stringify(results));
    