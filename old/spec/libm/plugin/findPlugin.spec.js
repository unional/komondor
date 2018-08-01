import { findPlugin, loadPlugins } from '.';
import { createTestIO, dummyPluginModule } from '../test-util';
test('not supported subject gets undefined', () => {
    const notSupportedSubject = { oh: 'no' };
    expect(findPlugin(notSupportedSubject)).toBe(undefined);
});
test('find plugin that handles the subject', async () => {
    const io = createTestIO();
    io.addPluginModule('@komondor-lab/plugin-fixture-dummy', dummyPluginModule);
    await loadPlugins({ io });
    const actual = findPlugin({});
    expect(actual).not.toBeUndefined();
});
//# sourceMappingURL=findPlugin.spec.js.map