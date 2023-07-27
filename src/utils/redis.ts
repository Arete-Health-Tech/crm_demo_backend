import { createClient } from "redis";

const redisConnectionStart = async () => {

  const redisClient = createClient();

  redisClient.on("error", (err) => console.log("Redis Client Error", err));

  await redisClient.connect();

  return redisClient;
}

export default redisConnectionStart;


// const cacheResults = await redisClient.get(species);
    //   results = JSON.parse(cacheResults)
    //   await redisClient.set(species, JSON.stringify(results));
    