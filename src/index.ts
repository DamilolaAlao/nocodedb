import { Filter, FindOptions, Sort, UpdateFilter } from 'mongodb';
import { createDB } from 'mongodb-data-api';

type Projection = FindOptions['projection'];
type NoInfer<A extends any> = [A][A extends any ? 0 : never];
type ExtendBaseParams<T> = BaseParams & T;
interface BaseParams {
  [key: string]: any;
}
type FilterParams<T> = Filter<T> & { _id?: any };

const convertID = (id: string) => {
  return { $oid: id };
};

const removeID = (id: { $oid: string }) => {
  return id.$oid;
};

export function NocoDB<InnerDoc = any>(modelname: string) {
  const db = new createDB('BASE_URL').createModel<InnerDoc>(modelname);

  async function create(data: InnerDoc) {
    console.log('create', data);
    const _id = (await db.insertOne({ document: data })).insertedId;
    return {
      ...data,
      _id,
    };
  }

  async function find<D = InnerDoc, T = NoInfer<D>>(
    params?: ExtendBaseParams<{
      filter?: FilterParams<T>;
      projection?: Projection;
    }>
  ) {
    if (params?.filter?._id) {
      params.filter._id = convertID(params.filter._id);
    }
    console.log('find', params);
    return (await db.findOne(params)).document;
  }

  async function findMany<D = InnerDoc, T = NoInfer<D>>(
    params?: ExtendBaseParams<{
      filter?: Filter<T>;
      projection?: Projection;
      sort?: Sort;
      limit?: number;
      skip?: number;
    }>
  ) {
    console.log('findMany', params);
    return (await db.find(params)).documents;
  }

  async function count(): Promise<number> {
    const data = await db.aggregate({
      pipeline: [
        {
          $count: 'count',
        },
      ],
    });
    return data.documents[0].count;
  }

  async function update<D = InnerDoc, T = NoInfer<D>>(
    params: ExtendBaseParams<{
      filter: FilterParams<T>;
      update: UpdateFilter<T>['$set'];
      upsert?: boolean;
    }>
  ) {
    if (params?.filter?._id) {
      params.filter._id = convertID(params.filter._id);
    }
    console.log('update', params);
    const data = await db.updateOne({
      filter: params.filter,
      update: {
        $set: params.update,
      },
    });
    if (data.modifiedCount) {
      if (params?.filter?._id) {
        params.filter._id = removeID(params.filter._id);
        return await find({ filter: params.filter });
      }
      return await find({ filter: params.filter });
    }
  }

  async function _delete<D = InnerDoc, T = NoInfer<D>>(
    params: ExtendBaseParams<{
      filter: FilterParams<T>;
    }>
  ) {
    const entity = await find(params);

    if (!entity) return null;

    params.filter._id = convertID(entity._id);

    console.log('delete', params);

    const data = await db.deleteOne(params);

    if (data.deletedCount) {
      return entity;
    }
  }

  return {
    create,
    count,
    find,
    findMany,
    update,
    delete: _delete,
  };
}
