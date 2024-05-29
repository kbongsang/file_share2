export interface configurationProps {
  size: number;
  crossover: number;
  mutation: number;
  iterations: number;
  fittestAlwaysSurvives: boolean;
  maxResults: number;
  webWorkers: boolean;
  skip: number;
}

class ValidationError extends Error {
  constructor(msg: string) {
    super(msg);
    this.name = "Genetic Solver: Validation Error!";
  }
}

export class Genetic {
  userData: any;
  internalGenState: any;

  entities: any[] = [];

  usingWebWorker: boolean = false;

  fitness?: (chromosome: any[]) => number;

  seed?: () => any[];
  mutate?: (obj: any) => any[];
  crossover?: (parent1: any[], parent2: any[]) => any[][];

  private select1Function?: (pop: any[]) => any;
  private select2Function?: (pop: any[]) => any[];
  private optimizationFunction?: (a: number, b: number) => boolean;

  generation?: any;
  notification?: (
    pop: any,
    generation?: any,
    stats?: any,
    isFinished?: boolean
  ) => void;

  configuration: configurationProps = {
    size: 250,
    crossover: 0.9,
    mutation: 0.2,
    iterations: 100,
    fittestAlwaysSurvives: true,
    maxResults: 100,
    webWorkers: true,
    skip: 0,
  };

  setSelect1Function(name: keyof typeof this.select1) {
    this.select1Function = this.select1[name];
  }

  setSelect2Function(name: keyof typeof this.select2) {
    this.select2Function = this.select2[name];
  }

  setOptimizationFunction(name: keyof typeof this.optimize) {
    this.optimizationFunction = this.optimize[name];
  }

  // Genetic Functions from here.
  serialization = {
    stringify: (obj: any) => {
      return JSON.stringify(obj, (_key: string, value: any) => {
        if (value instanceof Function || typeof value == "function")
          return "__func__:" + value.toString();
        else if (value instanceof RegExp) return "__regex__:" + value;
        else return value;
      });
    },
    parse: (str: string) => {
      return JSON.parse(str, (_key: string, value: any) => {
        if (typeof value !== "string") return value;
        else if (value.lastIndexOf("__func__:", 0) === 0)
          return eval("(" + value.slice(9) + ")");
        else if (value.lastIndexOf("__regex__:", 0) === 0)
          return eval("(" + value.slice(10) + ")");
        else return value;
      });
    },
  };

  clone = (obj: any) => {
    if (obj === null || typeof obj !== "object") return obj;
    else return JSON.parse(JSON.stringify(obj));
  };

  optimize = {
    maximize: (a: number, b: number) => {
      return a >= b;
    },
    minimize: (a: number, b: number) => {
      return a < b;
    },
  };

  select1 = {
    // find the best entity compares with 2.
    tournament2: (pop: any[]) => {
      if (this.optimizationFunction !== undefined) {
        const n = pop.length;
        const a = pop[Math.floor(Math.random() * n)]; // random item inside of 'pop'.
        const b = pop[Math.floor(Math.random() * n)]; // random item inside of 'pop'.

        return this.optimizationFunction(a.fitness, b.fitness)
          ? a.entity
          : b.entity;
      } else throw new ValidationError("optimizationFunction is not defined!");
    },

    // find the best entity compares with 3.
    tournament3: (pop: any[]) => {
      if (this.optimizationFunction !== undefined) {
        const n = pop.length;
        const a = pop[Math.floor(Math.random() * n)]; // random item inside of 'pop'.
        const b = pop[Math.floor(Math.random() * n)]; // random item inside of 'pop'.
        const c = pop[Math.floor(Math.random() * n)]; // random item inside of 'pop'.

        let best = this.optimizationFunction(a.fitness, b.fitness) ? a : b;
        best = this.optimizationFunction(best.fitness, c.fitness) ? best : c;
        return best.entity;
      } else throw new ValidationError("optimizationFunction is not defined!");
    },

    // Get first entity inside of 'pop'.
    fitTest: (pop: any[]) => {
      return pop[0].entity;
    },

    // Get random entity inside of 'pop'.
    random: (pop: any[]) => {
      return pop[Math.floor(Math.random() * pop.length)].entity;
    },

    randomLinearRank: (pop: any[]) => {
      this.internalGenState["rlr"] = this.internalGenState["rlr"] || 0;
      return pop[
        Math.floor(
          Math.random() * Math.min(pop.length, this.internalGenState["rlr"]++)
        )
      ].entity;
    },

    sequential: (pop: any[]) => {
      this.internalGenState["seq"] = this.internalGenState["seq"] || 0;
      return pop[this.internalGenState["seq"]++ % pop.length].entity;
    },
  };

  select2 = {
    tournament2: (pop: any[]) => {
      return [
        this.select1.tournament2.call(this, pop),
        this.select1.tournament2.call(this, pop),
      ];
    },

    tournament3: (pop: any[]) => {
      return [
        this.select1.tournament3.call(this, pop),
        this.select1.tournament3.call(this, pop),
      ];
    },

    random: (pop: any[]) => {
      return [
        this.select1.random.call(this, pop),
        this.select1.random.call(this, pop),
      ];
    },

    randomLinearRank: (pop: any[]) => {
      return [
        this.select1.randomLinearRank.call(this, pop),
        this.select1.randomLinearRank.call(this, pop),
      ];
    },

    sequential: (pop: any[]) => {
      return [
        this.select1.sequential.call(this, pop),
        this.select1.sequential.call(this, pop),
      ];
    },

    FittestRandom: (pop: any[]) => {
      return [
        this.select1.fitTest.call(this, pop),
        this.select1.random.call(this, pop),
      ];
    },
  };

  // Operations from here.
  start() {
    let i;

    const mutateOrNot = (entity: any) => {
      return Math.random() <= this.configuration.mutation && this.mutate
        ? this.mutate(this.clone(entity))
        : entity;
    };

    for (i = 0; i < this.configuration.size; ++i) {
      if (this.seed !== undefined) {
        this.entities.push(this.clone(this.seed()));
      } else throw new ValidationError("seed is not defined!");
    }
    // console.log("GeneticSolver: this.entities :", this.entities);
    // alert("test");

    for (i = 0; this.configuration.iterations; ++i) {
      this.internalGenState = {};

      let pop: {
        fitness: number;
        entity: any;
      }[] = this.entities
        .map((entity) => {
          if (this.fitness !== undefined) {
            // console.log("entity :", entity);
            return { fitness: this.fitness(entity), entity: entity };
          } else throw new ValidationError("fitness is not defined!");
        })
        .sort((a, b) => {
          if (this.optimizationFunction !== undefined) {
            return this.optimizationFunction(a.fitness, b.fitness) ? -1 : 1;
          } else
            throw new ValidationError("optimizationFunction is not defined!");
        });

      let mean =
        pop.reduce((a, b) => {
          // console.log("test!!! :", pop, a, b.fitness);
          return a + b.fitness;
        }, 0) / pop.length;

      let stdDev = Math.sqrt(
        pop
          .map((a) => {
            return Math.pow(a.fitness - mean, 2);
          })
          .reduce((a, b) => {
            return a + b;
          }, 0) /
          (pop.length - 1)
      );

      let stats = {
        maximum: pop[0].fitness,
        minimum: pop[pop.length - 1].fitness,
        mean: mean,
        stdDev: stdDev,
      };

      let r = this.generation ? this.generation(pop, i, stats) : true;
      let isFinished =
        (typeof r !== "undefined" && !r) ||
        i === this.configuration.iterations - 1;

      if (
        this.notification &&
        (this.configuration["skip"] === 0 ||
          i % this.configuration["skip"] === 0)
      ) {
        this.sendNotification(
          pop.slice(0, this.configuration.maxResults),
          i,
          stats,
          isFinished
        );
      }

      if (isFinished) break;

      const newPop: any[] = [];

      if (this.configuration.fittestAlwaysSurvives) {
        newPop.push(pop[0].entity);
      }

      while (newPop.length < this.configuration.size) {
        if (
          this.crossover &&
          Math.random() <= this.configuration.crossover &&
          newPop.length + 1 < this.configuration.size
        ) {
          if (this.select2Function !== undefined) {
            const parents = this.select2Function(pop);
            const children = this.crossover(
              this.clone(parents[0]),
              this.clone(parents[1])
            ).map(mutateOrNot);

            newPop.push(children[0], children[1]);
          } else throw new ValidationError("select2Function is not defined!");
        } else {
          if (this.select1Function !== undefined)
            newPop.push(mutateOrNot(this.select1Function(pop)));
          else throw new ValidationError("select1Function is not defined!");
        }
      }

      this.entities = newPop;
    }
  }

  sendNotification(pop: any, generation?: any, stats?: any, isFinished?: any) {
    let response = {
      pop: pop.map(this.serialization.stringify),
      generation: generation,
      stats: stats,
      isFinished: isFinished,
    };

    if (this.usingWebWorker) {
      postMessage(response);
    } else {
      if (this.notification !== undefined) {
        this.notification(
          response.pop.map(this.serialization.parse),
          response.generation,
          response.stats,
          response.isFinished
        );
      } else throw new ValidationError("notification is not defined!");
    }
  }

  evolve(config: configurationProps) {
    this.configuration = config;

    console.log(this.configuration);

    this.usingWebWorker =
      this.configuration.webWorkers &&
      typeof Blob !== "undefined" &&
      typeof Worker !== "undefined" &&
      typeof window.URL !== "undefined" &&
      typeof window.URL.createObjectURL !== "undefined";

    const addSlashes = (str: string) => {
      return str.replace(/[\\"']/g, "\\$&").replace(/\u0000/g, "\\0");
    };

    // bootstrap webworker script.
    let blobScript =
      "let serialization = {'stringify': " +
      this.serialization.stringify.toString() +
      ", 'parse': " +
      this.serialization.parse.toString() +
      "};\n";

    blobScript += "let clone = " + this.clone.toString() + ";\n";

    // Make available in webworker.
    blobScript +=
      'let optimize = serialization.parse("' +
      addSlashes(this.serialization.stringify(this.optimizationFunction)) +
      '");\n';

    blobScript +=
      'let select1 = serialization.parse("' +
      addSlashes(this.serialization.stringify(this.select1Function)) +
      '");\n';

    blobScript +=
      'let select2 = serialization.parse("' +
      addSlashes(this.serialization.stringify(this.select2Function)) +
      '");\n';

    // materialize our ga instance in the worker
    blobScript +=
      'let genetic = serialization.parse("' +
      addSlashes(this.serialization.stringify(this)) +
      '");\n';

    blobScript += "onmessage = function(e) { genetic.start(); }\n";

    // console.log(blobScript);

    const self = this;

    if (this.usingWebWorker) {
      // webworker
      const blob = new Blob([blobScript]);
      const worker = new Worker(window.URL.createObjectURL(blob));
      worker.onmessage = function (e) {
        const response = e.data;
        if (self.notification !== undefined)
          self.notification(
            response.pop.map(self.serialization.parse),
            response.generation,
            response.stats,
            response.isFinished
          );
        else throw new ValidationError("notification is not defined!");
      };

      worker.onerror = function (e) {
        alert(
          "ERROR: Line " + e.lineno + " in " + e.filename + ": " + e.message
        );
      };
      worker.postMessage("");
    } else {
      this.start();
    }
  }
}
