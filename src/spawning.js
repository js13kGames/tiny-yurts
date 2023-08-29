import { Yurt, yurts } from './yurt';
import { farms } from './farm';
import { paths } from './path';
import { OxFarm } from './ox-farm';
import { GoatFarm, goatFarms } from './goat-farm';
import { boardOffsetX, boardOffsetY, boardWidth, boardHeight } from './svg';

// Figure out what to spawn depending on totalUpdates & current score

const farmTypesOrder = ['ox', 'goat']; // TODO: fish, crops, horses(?)
const currentFarmTypes = [];

export const getRandomPosition = ({
  width = 1,
  height = 1,
  anchor = {x: boardWidth / 2 + 0.5, y: boardHeight / 2 + 0.5, width: 1, height: 1},
  minDistance = 0,
  maxDistance = 99,
  maxNumAttempts = 8, // TODO: Clever ways to not hit this. >8 makes game go sloww
  extra = { x: 0, y: 0 }, // relative to x/y
}) => {
  let numAttempts = 0;
  // TODO: Check if these are inlined
  const w = width;
  const h = height;

  while (numAttempts < maxNumAttempts) {
    numAttempts++;
    // +1 and -1 are to prevent spawning right on the edge of the board
    const minX = Math.max(boardOffsetX + 1, anchor.x - maxDistance);
    const maxX = Math.min(boardWidth - w + 2, anchor.x + anchor.width + maxDistance);
    const minY = Math.max(boardOffsetY + 1, anchor.y - maxDistance);
    const maxY = Math.min(boardHeight - h + 2, anchor.y + anchor.height + maxDistance);
    const x = Math.floor(minX + (Math.random() * (maxX - minX)));
    const y = Math.floor(minY + (Math.random() * (maxY - minY)));

    // Check if too close to position
    if (
      x < anchor.x + anchor.width + minDistance - 1 &&
      x > anchor.x - minDistance &&
      y < anchor.y + anchor.height + minDistance - 1 &&
      y > anchor.y - minDistance
    ) continue;

    // // Check if too far away from position
    // if (
    //   x > anchor.x + maxDistance ||
    //   x < anchor.x - maxDistance ||
    //   y > anchor.y + maxDistance ||
    //   y < anchor.y - maxDistance
    // ) continue;

    const farmObstruction = farms.some(farm => farm.points.some((farmCell) => {
      for (let w = 0; w < width; w++) {
        for (let h = 0; h < height; h++) {
          if (x + w === farmCell.x && y + y === farmCell.y) return true;
        }
      }
    }));
    if (farmObstruction) continue;

    const farmExtraObstruction = farms.some(farm => farm.points.some((farmCell) =>
      x + extra.x === farmCell.x && y + extra.y === farmCell.y
    ));
    if (farmExtraObstruction) continue;

    // All yurts have paths underneath them so we don't need to check for this
    // const yurtObstruction = yurts.some(yurt => {
    //   for (let w = 0; w < width; w++) {
    //     for (let h = 0; h < height; h++) {
    //       if (x + w === yurt.x && y + h === yurt.y) return true;
    //     }
    //   }
    // });
    // if (yurtObstruction) continue;

    const pathObstruction = paths.some(path => {
      for (let w = 0; w < width; w++) {
        for (let h = 0; h < height; h++) {
          if (
            (x + w === path.points[0].x && y + h === path.points[0].y)
            ||
            (x + w === path.points[1].x && y + h === path.points[1].y)
          ) {
            return true;
          }
        }
      }

      if (
        (x + extra.x === path.points[0].x && y + extra.y === path.points[0].y)
        ||
        (x + extra.x === path.points[1].x && y + extra.y === path.points[1].y)
      ) {
        return true;
      }
    });
    if (pathObstruction) continue;

    return ({ x, y });
  }

  console.log('didnt manage to find somewhere boo');
};

const getRandomFarmProps = () => {
  const portrait = Math.random() > 0.5;
  const randWidthHeight = portrait ? { w: 2, h: 3 } : { w: 3, h: 2 };
  const randPathPosX1 = Math.floor(Math.random() * randWidthHeight.w);
  const randPathPosY1 = Math.floor(Math.random() * randWidthHeight.h);
  const randPathPosX2 = portrait ? randPathPosX1 * 3 - 1 : randPathPosX1;
  const randPathPosY2 = portrait ? randPathPosY1 : randPathPosY1 * 3 - 1;

  return ({
    width: randWidthHeight.w,
    height: randWidthHeight.h,
    relativePathPoints: [
      { x: randPathPosX1, y: randPathPosY1 },
      { x: randPathPosX2, y: randPathPosY2 },
    ],
  });
}

const getRandomYurtProps = () => {
  // Which way is the yurt facing (randomly up/down/left/right to start)
  // TODO: Less disguisting way to determine initial direction
  // TODO: Disallow spawning facing into another yurt cell
  const facingInt = Math.random();
  let facing

  if (facingInt < 0.25) {
    facing = { x: 0, y: -1 }
  } else if (facingInt < 0.5) {
    facing = { x: 1, y: 0 }
  } else if (facingInt < 0.75) {
    facing = { x: 0, y: 1 }
  } else {
    facing = { x: -1, y: 0 }
  };

  return ({
    facing,
  });
};

export const spawnNewObjects = (updateCount) => {
  // console.log(updateCount);

  // Spawn the first farm, early on, near the center
  if (updateCount === 100) {
    const { width, height, relativePathPoints } = getRandomFarmProps();

    const randomPosition = getRandomPosition({
      width,
      height,
      maxDistance: 2,
      extra: { x: relativePathPoints[1].x, y: relativePathPoints[1].y },
    });
    console.log(`spawned ox farm at ${randomPosition.x}, ${randomPosition.y}`);
    const newOxFarm = new OxFarm({
      width,
      height,
      x: randomPosition.x,
      y: randomPosition.y,
      relativePathPoints,
    });
    return;
  }

  // Spawn the first yurt really soon after
  if (updateCount === 500) {
    console.log('spawning the first yurt');
    const { facing } = getRandomYurtProps();
    const farm1 = farms[0];
    const randomPosition = getRandomPosition({
      anchor: {
        x: farm1.x,
        y: farm1.y,
        width: farm1.width,
        height: farm1.height,
      },
      minDistance: 3,
      maxDistance: 3,
      extra: facing,
    });

    if (randomPosition) {
      const newYurt = new Yurt({
        x: randomPosition.x,
        y: randomPosition.y,
        type: 'ox',
        facing,
      });
    }

    return;
  }

  // if (updateCount === 1500) {
  if (updateCount > 1000 && updateCount % 80 === 0) {
    const { facing } = getRandomYurtProps();
    const yurt1 = yurts[0];

    const randomPosition = getRandomPosition({
      anchor: {
        x: yurt1.x,
        y: yurt1.y,
        width: 1,
        height: 1,
      },
      minDistance: 2,
      maxDistance: 2,
      extra: facing,
    });

    if (randomPosition) {
      const newYurt = new Yurt({
        x: randomPosition.x,
        y: randomPosition.y,
        type: 'goat',
        facing,
      });
    }

    return;
  }

  // // Spawn the second a medium distance away from the first
  // if (updateCount === 3000) {
  //   const { width, height, relativePathPoints } = getRandomFarmProps();

  //   const randomPosition = getRandomPosition({
  //     width,
  //     height,
  //     anchor: {
  //       x: farms[0].x,
  //       y: farms[0].y,
  //     },
  //     minDistance: 4,
  //     maxDistance: 8,
  //     extra: { x: relativePathPoints[1].x, y: relativePathPoints[1].y },
  //   });
  //   console.log(`spawned goat farm at ${randomPosition.x}, ${randomPosition.y}`);
  //   const newGoatFarm = new GoatFarm({
  //     width,
  //     height,
  //     x: randomPosition.x,
  //     y: randomPosition.y,
  //     relativePathPoints,
  //   });
  //   return;
  // }

  // if (updateCount === 3500) {
  //   const farm1 = goatFarms[0];
  //   const randomPosition = getRandomPosition({
  //     anchor: {
  //       x: farm1.x + farm1.width / 2 - 0.5,
  //       y: farm1.y + farm1.height / 2 - 0.5,
  //     },
  //     minDistance: 3,
  //     maxDistance: 5,
  //   });
  //   console.log(`spawned yurt at ${randomPosition.x}, ${randomPosition.y}`);
  //   const newYurt = new Yurt({
  //     x: randomPosition.x,
  //     y: randomPosition.y,
  //     type: 'goat'
  //   });
  //   return;
  // }

  // if (updateCount === 4000) {
  //   const farm1 = goatFarms[0];
  //   const randomPosition = getRandomPosition({
  //     anchor: {
  //       x: farm1.x + farm1.width / 2 - 0.5,
  //       y: farm1.y + farm1.height / 2 - 0.5,
  //     },
  //     minDistance: 3,
  //     maxDistance: 5,
  //   });
  //   console.log(`spawned yurt at ${randomPosition.x}, ${randomPosition.y}`);
  //   const newYurt = new Yurt({
  //     x: randomPosition.x,
  //     y: randomPosition.y,
  //     type: 'goat'
  //   });
  //   return;
  // }

  // if (updateCount > 4000 && updateCount % 1250 === 0) {
  //   const { width, height, relativePathPoints } = getRandomFarmProps();

  //   const randomPosition = getRandomPosition({
  //     width,
  //     height,
  //     extra: { x: relativePathPoints[1].x, y: relativePathPoints[1].y },
  //   });

  //   if (Math.random() > 0.5) {
  //     const newGoatFarm = new GoatFarm({
  //       width,
  //       height,
  //       x: randomPosition.x,
  //       y: randomPosition.y,
  //       relativePathPoints,
  //     });
  //   } else {
  //     const newOxFarm = new OxFarm({
  //       width,
  //       height,
  //       x: randomPosition.x,
  //       y: randomPosition.y,
  //       relativePathPoints,
  //     });
  //   }
  //   return;
  // }

  // if (updateCount > 4000 && (updateCount % 1500 === 0 || updateCount % 1750 === 0)) {
  //   const randomPosition = getRandomPosition({});
  //   const newYurt = new Yurt({
  //     x: randomPosition.x,
  //     y: randomPosition.y,
  //     type: Math.random() > 0.5 ? 'goat' : 'ox',
  //   });
  //   return;
  // }
}