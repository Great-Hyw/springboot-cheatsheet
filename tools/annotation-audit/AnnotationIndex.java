import java.io.*;
import java.net.*;
import java.nio.file.*;
import java.util.*;
import java.util.jar.*;

public class AnnotationIndex {
    static final String[] PREFIXES = {
        "org.springframework", "jakarta.", "org.mybatis", "org.apache.ibatis", "org.junit", "org.mockito",
        "org.hibernate", "com.fasterxml.jackson.annotation", "org.aspectj.lang.annotation",
        "org.slf4j", "org.quartz"
    };

    public static void main(String[] args) throws Exception {
        Path lib = Paths.get(args[0]);
        List<URL> urls = new ArrayList<>();
        List<String> classNames = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(lib, "*.jar")) {
            for (Path p : ds) {
                urls.add(p.toUri().toURL());
                try (JarFile jf = new JarFile(p.toFile())) {
                    Enumeration<JarEntry> en = jf.entries();
                    while (en.hasMoreElements()) {
                        String n = en.nextElement().getName();
                        if (!n.endsWith(".class") || n.contains("module-info") || n.contains("META-INF/versions")) continue;
                        String cn = n.substring(0, n.length() - 6).replace('/', '.');
                        if (!matches(cn) || !seen.add(cn)) continue;
                        classNames.add(cn);
                    }
                }
            }
        }
        URLClassLoader cl = new URLClassLoader(urls.toArray(new URL[0]), ClassLoader.getSystemClassLoader());
        List<String> out = new ArrayList<>();
        int total = 0, annotated = 0, failed = 0;
        for (String cn : classNames) {
            total++;
            try {
                Class<?> c = Class.forName(cn, false, cl);
                if (!c.isAnnotation()) continue;
                annotated++;
                StringBuilder sb = new StringBuilder();
                sb.append("## ").append(cn).append('\n');
                java.lang.annotation.Target t = c.getAnnotation(java.lang.annotation.Target.class);
                if (t != null) {
                    List<String> ts = new ArrayList<>();
                    for (java.lang.annotation.ElementType e : t.value()) ts.add(e.name());
                    sb.append("target: ").append(String.join(", ", ts)).append('\n');
                }
                java.lang.annotation.Retention r = c.getAnnotation(java.lang.annotation.Retention.class);
                if (r != null) sb.append("retention: ").append(r.value().name()).append('\n');
                java.lang.annotation.Documented d = c.getAnnotation(java.lang.annotation.Documented.class);
                if (d != null) sb.append("documented: true\n");
                try {
                    for (java.lang.reflect.Method m : c.getDeclaredMethods()) {
                        Object dv = m.getDefaultValue();
                        sb.append("  - ").append(m.getReturnType().getSimpleName()).append(' ').append(m.getName()).append("()");
                        if (dv == null) sb.append("   // no default");
                        else {
                            sb.append(" default ");
                            if (dv.getClass().isArray()) {
                                int len = java.lang.reflect.Array.getLength(dv);
                                List<String> vs = new ArrayList<>();
                                for (int i = 0; i < len; i++) vs.add(String.valueOf(java.lang.reflect.Array.get(dv, i)));
                                sb.append('{').append(String.join(", ", vs)).append('}');
                            } else sb.append(String.valueOf(dv));
                        }
                        sb.append('\n');
                    }
                } catch (Throwable e) {
                    sb.append("  ! element resolution failed: ").append(e).append('\n');
                }
                out.add(sb.toString());
            } catch (Throwable e) {
                failed++;
            }
        }
        Collections.sort(out);
        Files.createDirectories(Paths.get("index"));
        Files.writeString(Paths.get("index/annotations.txt"), String.join("\n", out));
        System.out.println("scanned=" + total + " annotations=" + annotated + " failed=" + failed);
    }

    static boolean matches(String cn) {
        for (String p : PREFIXES) if (cn.startsWith(p)) return true;
        return false;
    }
}
