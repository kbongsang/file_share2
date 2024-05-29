import { CeilingAndFloor } from "../BIM/CeilingAndFloor";

export class Floor extends CeilingAndFloor {
  constructor(id: string, meta: object, location: null = null) {
    super(id, meta, location);
  }
}
