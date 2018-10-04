module.exports = {
    pick: (object, ...paths) => {
        //paths = Array.isArray(paths) ? paths : [paths];
        const obj = {};
    		for (const path of paths) {
        	if (object[path]) {
          	obj[path] = object[path]
          }
        }
        return obj;
    },
    assign: (a, b) => {
        Object.assign(a, b);
    },
    defaults: (object, ...sources) => {
      object = Object(object)
      sources.forEach((source) => {
        if (source != null) {
          source = Object(source)
          for (const key in source) {
            const value = object[key]
            if (value === undefined) {
              object[key] = source[key]
            }
          }
        }
      })
      return object
    }
}
