import {graphql} from 'graphql';
import schemaRelay from '../../test-api/schema-paginated/index';
import {partial} from 'lodash';
import {errCheck} from '../helpers/_util';

const run = partial(graphql, schemaRelay);

test('should handle limit at the root', async () => {
  const query = `{
    usersFirst2 {
      fullName
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    usersFirst2: [{fullName: 'andrew carlson'}, {fullName: 'matt elder'}],
  };
  expect(expected).toEqual(data);
});

test('should handle limit for one-to-many', async () => {
  const query = `{
    user(id: 1) {
      commentsLast2 {
        id
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      commentsLast2: [{id: 'Q29tbWVudDo4'}, {id: 'Q29tbWVudDo2'}],
    },
  };
  expect(expected).toEqual(data);
});

test('should handle limit for many-to-many', async () => {
  const query = `{
    user(id: 3) {
      followingFirst {
        fullName
      }
    }
  }`;
  const {data, errors} = await run(query);
  errCheck(errors);
  const expected = {
    user: {
      followingFirst: [{fullName: 'andrew carlson'}],
    },
  };
  expect(expected).toEqual(data);
});
