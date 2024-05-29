import { Genetic } from "./GeneticSolver";

/**
 * Configuration options for the genetic algorithm.
 */
interface GeneticConfig {
  /**
   * The population size for each generation.
   */
  size: number;
  /**
   * The percentage of individuals to be selected for crossover.
   */
  crossover: number;
  /**
   * The percentage of individuals to be mutated.
   */
  mutation: number;
  /**
   * The number of iterations (generations) to run the algorithm.
   */
  iterations: number;
  /**
   * Determines whether the fittest individual always survives to the next generation.
   */
  fittestAlwaysSurvives: boolean;
  /**
   * The maximum number of results to return.
   */
  maxResults: number;
  /**
   * Determines whether to use web workers for parallel processing.
   */
  webWorkers: boolean;
  /**
   * The number of individuals to skip before starting the selection process.
   */
  skip: number;
  /**
   * A function that generates the initial seed population.
   */
  seedFunc: GeneticGetSeed;
  /**
   * A function that mutates an individual.
   */
  mutateFunc: GeneticMutate;
  /**
   * A function that performs crossover between two individuals.
   */
  crossoverFunc: GeneticCrossover;
  /**
   * A function that calculates the fitness of an individual.
   */
  fitnessFunc: GeneticFitness;
}

const defaultConfig: GeneticConfig = {
  size: 100,
  crossover: 0.9,
  mutation: 0.2,
  iterations: 10,
  fittestAlwaysSurvives: true,
  maxResults: 100,
  webWorkers: false,
  skip: 0,
  seedFunc: () => [],
  mutateFunc: (entities: number[]) => entities,
  crossoverFunc: (mother: number[], father: number[]) => [mother, father],
  fitnessFunc: (_entities: number[]) => 0,
};

export const seedFunctions: Function[] = [];
export let SELECT_1:
  | "tournament2"
  | "tournament3"
  | "fitTest"
  | "random"
  | "randomLinearRank"
  | "sequential" = "tournament2";

export let SELECT_2:
  | "tournament2"
  | "tournament3"
  | "random"
  | "randomLinearRank"
  | "sequential"
  | "FittestRandom" = "tournament2";

export let OPTIMIZATION: "maximize" | "minimize" = "maximize";

/**
 * Retrieves the seed value for the genetic algorithm.
 *
 * @returns The seed value for the genetic algorithm.
 */
type GeneticGetSeed = () => number[];

/**
 * Represents a function that performs mutation in a genetic algorithm.
 * Mutation is a genetic operator used to introduce genetic diversity in the population.
 * It randomly modifies one or more genes in an individual's chromosome.
 *
 * @param entities - The array of entities to be mutated.
 * @returns The mutated array of entities.
 */
type GeneticMutate = (entities: number[]) => number[];

/**
 * Represents a function that performs crossover in a genetic algorithm.
 * Given a mother and a father chromosome, the crossover function produces
 * one or more offspring chromosomes by combining genetic material from both parents.
 *
 * @param mother - The chromosome of the mother.
 * @param father - The chromosome of the father.
 * @returns An array of offspring chromosomes produced by the crossover operation.
 */
type GeneticCrossover = (mother: number[], father: number[]) => number[][];

/**
 * Represents a fitness function used in a genetic algorithm.
 * The fitness function evaluates the fitness or quality of a given set of entities.
 * It takes an array of numbers representing the entities and returns a number indicating their fitness.
 *
 * @param entities - An array of numbers representing the entities to be evaluated.
 * @returns A number indicating the fitness or quality of the given entities.
 */
type GeneticFitness = (entities: number[]) => number;

export const runGenetic = (config: GeneticConfig = defaultConfig) => {
  // TODO: Check if the config is valid.
  const result: any[] = [];
  const genetic = new Genetic();
  genetic.setSelect1Function(SELECT_1);
  genetic.setSelect2Function("tournament2");
  genetic.setOptimizationFunction("maximize");

  genetic.seed = config.seedFunc;
  genetic.crossover = config.crossoverFunc;
  genetic.mutate = config.mutateFunc;
  genetic.fitness = config.fitnessFunc;

  genetic.notification = (pop, _generation, stats, isFinished) => {
    if (isFinished) {
      console.log("genetic result :");
      console.log(pop);
      console.log(stats);
      result.push(...pop);
    }
  };

  genetic.evolve(config);
};

// TODO: Implement the following functions.
export const geneticTest = () => {};

export const seed = () => {
  seedFunctions.forEach((fn) => {
    if (fn.length > 0) {
      const result = fn("Parameter");
      console.log("Seed: Result: ", result);
    } else fn();
  });

  seedFunctions.length = 0;
};

const initializeSeed = () => {
  console.log("Initializing seed...");
};

seedFunctions.push(initializeSeed);
