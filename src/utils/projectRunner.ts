
/**
 * Universal Application Runner Logic
 */

export type ProjectType = 'node' | 'python-flask' | 'python-django' | 'java-springboot' | 'go' | 'unknown';

export interface RunConfig {
    name: string;
    installCmd: string;
    runCmd: string;
    urlRegex?: RegExp;
    fileToWatch?: string; // Optional: file to check existence of
}

// Helper to check file existence via IPC
const fileExists = async (rootPath: string, filename: string): Promise<boolean> => {
    if (!window.ipcRenderer) return false;
    try {
        const result = await window.ipcRenderer.invoke('fs:readFile', `${rootPath}/${filename}`);
        return result.success;
    } catch {
        return false;
    }
};

export const detectProjectType = async (rootPath: string): Promise<ProjectType> => {
    console.log(`[ProjectRunner] Detecting project type in: ${rootPath}`);

    if (await fileExists(rootPath, 'package.json')) {
        return 'node';
    }
    if (await fileExists(rootPath, 'pom.xml')) {
        return 'java-springboot';
    }
    if (await fileExists(rootPath, 'manage.py')) {
        return 'python-django';
    }
    if (await fileExists(rootPath, 'requirements.txt') || await fileExists(rootPath, 'app.py')) {
        return 'python-flask'; // Assuming Flask if requirements or app.py exist w/o manage.py
    }
    if (await fileExists(rootPath, 'go.mod')) {
        return 'go';
    }

    return 'unknown';
};

export const getRunConfig = (type: ProjectType): RunConfig => {
    switch (type) {
        case 'node':
            return {
                name: 'Node.js / React / Vite',
                installCmd: 'npm install',
                runCmd: 'npm run dev', // Default to dev, fallback to start?
                urlRegex: /(http:\/\/localhost:\d+)/
            };
        case 'python-flask':
            return {
                name: 'Python (Flask)',
                installCmd: 'pip install -r requirements.txt',
                runCmd: 'python app.py', // Or 'flask run'
                urlRegex: /(?:Running on|Listening at) (http:\/\/[\w\.:]+)/
            };
        case 'python-django':
            return {
                name: 'Python (Django)',
                installCmd: 'pip install -r requirements.txt',
                runCmd: 'python manage.py runserver',
                urlRegex: /Starting development server at (http:\/\/[\w\.:]+)/
            };
        case 'java-springboot':
            return {
                name: 'Java (Spring Boot)',
                installCmd: './mvnw install -DskipTests', // Skip tests for faster startup
                runCmd: './mvnw spring-boot:run',
                urlRegex: /Tomcat started on port\(s\): (\d+)/ // Spring logs are tricky, typically need to construct localhost:PORT
            };
        case 'go':
            return {
                name: 'Go (Golang)',
                installCmd: 'go mod tidy',
                runCmd: 'go run .',
                urlRegex: /Listening on ([\w\.:]+)/
            };
        default:
            return {
                name: 'Unknown Stack',
                installCmd: 'echo "Unknown project type"',
                runCmd: 'echo "Please configure run command manually"',
            };
    }
};
