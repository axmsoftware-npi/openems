import { GetEdgeConfigResponse } from "../jsonrpc/response/getEdgeConfigResponse";

export class EdgeConfig {

    constructor(source?: GetEdgeConfigResponse) {
        if (source) {
            this.components = source.result.components;
            this.factories = source.result.factories;
        }

        // initialize Components
        for (let componentId in this.components) {
            this.components[componentId].id = componentId;
        }

        // initialize Factorys
        for (let factoryId in this.factories) {
            let factory = this.factories[factoryId];
            factory.id = factoryId;
            factory.componentIds = [];

            // Fill 'natures' map
            for (let natureId of factory.natureIds) {
                if (!(natureId in this.natures)) {
                    let parts = natureId.split(".");
                    let name = parts[parts.length - 1];
                    this.natures[natureId] = {
                        id: natureId,
                        name: name,
                        factoryIds: []
                    };
                }
                this.natures[natureId].factoryIds.push(factoryId);
            }
        }

        if (Object.keys(this.components).length != 0 && Object.keys(this.factories).length == 0) {
            console.warn("Factory definitions are missing.");
        } else {
            for (let componentId in this.components) {
                let component = this.components[componentId];
                if (component.factoryId === "") {
                    continue; // Singleton components have no factory-PID
                }
                let factory = this.factories[component.factoryId];
                if (!factory) {
                    console.warn("Factory definition for [" + component.factoryId + "] is missing.");
                    continue;
                }

                // Complete 'factories' map
                factory.componentIds.push(componentId);
            }
        }
    }

    /**
     * Component-ID -> Component.
     */
    public readonly components: { [id: string]: EdgeConfig.Component } = {};

    /**
     * Factory-PID -> OSGi Factory.
     */
    public readonly factories: { [id: string]: EdgeConfig.Factory } = {};

    /**
     * Nature-PID -> Component-IDs.
     */
    public readonly natures: { [id: string]: EdgeConfig.Nature } = {}

    public isValid(): boolean {
        return Object.keys(this.components).length > 0 && Object.keys(this.factories).length > 0;
    }

    /**
     * Get Component-IDs of Component instances by the given Factory.
     * 
     * @param factoryId the Factory PID.
     */
    public getComponentIdsByFactory(factoryId: string): string[] {
        let factory = this.factories[factoryId];
        if (factory) {
            return factory.componentIds;
        } else {
            return [];
        }
    }

    /**
     * Get Component instances by the given Factory.
     * 
     * @param factoryId the Factory PID.
     */
    public getComponentsByFactory(factoryId: string): EdgeConfig.Component[] {
        let componentIds = this.getComponentIdsByFactory(factoryId);
        let result: EdgeConfig.Component[] = [];
        for (let componentId of componentIds) {
            result.push(this.components[componentId]);
        }
        return result;
    }

    /**
     * Get Component-IDs of Components that implement the given Nature.
     * 
     * @param nature the given Nature.
     */
    public getComponentIdsImplementingNature(natureId: string): string[] {
        let result: string[] = [];
        let nature = this.natures[natureId];
        if (nature) {
            for (let factoryId of nature.factoryIds) {
                result.push.apply(result, this.getComponentIdsByFactory(factoryId));
            }
        }
        return result;
    }

    /**
     * Get Components that implement the given Nature.
     * 
     * @param nature the given Nature.
     */
    public getComponentsImplementingNature(natureId: string): EdgeConfig.Component[] {
        let result: EdgeConfig.Component[] = [];
        let nature = this.natures[natureId];
        if (nature) {
            for (let factoryId of nature.factoryIds) {
                result.push.apply(result, this.getComponentsByFactory(factoryId));
            }
        }
        return result;
    }

    /**
     * Get the implemented NatureIds by Factory-ID.
     * 
     * @param factoryId the Factory-ID
     */
    public getNatureIdsByFactoryId(factoryId: string): string[] {
        let factory = this.factories[factoryId];
        if (factory) {
            return factory.natureIds;
        } else {
            return [];
        }
    }

    /**
     * Get the implemented Natures by Component-ID.
     * 
     * @param componentId the Component-ID
     */
    public getNatureIdsByComponentId(componentId: string): string[] {
        let component = this.components[componentId];
        if (!component) {
            return [];
        }
        let factoryId = component.factoryId;
        return this.getNatureIdsByFactoryId(factoryId);
    }

    /**
     * Get the Component properties.
     * 
     * @param componentId the Component-ID
     */
    public getComponentProperties(componentId: string): { [key: string]: any } {
        let component = this.components[componentId];
        if (component) {
            return component.properties;
        } else {
            return {};
        }
    }
}

export module EdgeConfig {

    export class Component {
        public id: string = "";

        constructor(
            public readonly factoryId: string = "",
            public readonly properties: { [key: string]: any } = {}
        ) { }
    }

    export class Factory {
        public id: string = "";
        public componentIds: string[] = [];

        constructor(
            public readonly name: string,
            public readonly natureIds: string[] = [],
            public readonly properties: {
                id: string,
                name: string,
                description: string,
                isRequired: boolean,
                defaultValue: any,
                schema: {}
            }[] = []
        ) { }
    }

    export class Nature {
        public id: string = "";
        public name: string = "";
        public factoryIds: string[] = [];
    }

}
