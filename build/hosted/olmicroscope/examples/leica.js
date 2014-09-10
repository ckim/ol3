// goog.require('ol.style.Stroke');




var createMap = function(divId, viewToUse, rotate) {
    rotate = rotate || false;
    var mapOptions = {
        layers: [
            // new ol.layer.Tile({
            //   source: new ol.source.OSM(
            // })
        ],
        renderer: exampleNS.getRendererFromQueryString(),
        target: divId,
        view: viewToUse
    };
    if (rotate) {
        mapOptions.interactions = ol.interaction.defaults().extend([
            new ol.interaction.DragRotateAndZoom()
        ]);
    }
    return new ol.Map(mapOptions);
};


var styleFunction = (function() {
    return function(feature, resolution) {
        if (feature.get('hexcolor')) {
            return [new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: feature.get('hexcolor'),
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(0,0,0,0.0)'
                }),
                text: new ol.style.Text({
                    textAlign: "start",
                    textBaseline: "top",
                    font: "20px Arial",
                    text: feature.get('title'),
                    fill: new ol.style.Fill({
                        color: "#000000"
                    }),
                    stroke: new ol.style.Stroke({
                        color: feature.get('hexcolor'),
                        width: 3
                    }),
                    offsetX: 0,
                    offsetY: 0,
                    rotation: 0
                })
            })]
        } else {
            return [new ol.style.Style({
                fill: new ol.style.Fill({
                    color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                    color: 'ffffff',
                    width: 1
                }),
                image: new ol.style.Circle({
                    radius: 1,
                    fill: new ol.style.Fill({
                        color: '#ffffff'
                    })
                })
            })]
        }
    };
})();




// done map init, now create layers from a image to load
var example_leica_image = 'http://images.aperio.com/Breast%20PR20x.svs'

// we keep the last layer in case we navigate in z
var image_layer = undefined;
var last_image_layer = undefined;
var image_z_index = 0;
var image_metadata = undefined;
var map = undefined;

var vector_source = undefined; 
var vector_layer = undefined; 


function loadLeicaImage(base_path) {

    var metadata_url = base_path + '?INFO3';

    function parseInfoXML(xmldata) {
        // Simply split the reponse as a string
        var tmp = xmldata.split('|');
        var w = parseInt(tmp[0]);
        var h = parseInt(tmp[1]);

        var appmag = parseInt(tmp[7].split('=')[1].trim())
        var tsx = parseInt(tmp[3]);
        var tsy = parseInt(tmp[4]);

        // Calculate the number of resolutions - smallest fits into a tile
        var max = (w > h) ? w : h;
        var n = 1;

        while (max > tsx) {
            max = Math.floor(max / 2);
            n++;
        }

        var result = {
            'appmag': appmag,
            'max_size': {
                w: w,
                h: h
            },
            'tileSize': {
                w: tsx,
                h: tsy
            },
            'num_resolutions': n
        };
        return result;
    }



    $.ajax({
        url: metadata_url,
        success: function(data) {

            var image_metadata = parseInfoXML(data);

            image_metadata['url'] = base_path;
            image_metadata['thumbnail'] = base_path + "?0+0+0+256+-1+80";

            createViewer(image_metadata);


        }
    });

}

function decimalToHex(d, padding) {
    var hex = Number(d).toString(16);
    padding = typeof(padding) === "undefined" || padding === null ? padding = 2 : padding;
    while (hex.length < padding) {
        hex = "0" + hex;
    }
    return hex;
}


function addAperioAnnotation(aperio_url) {

    var annotation_url = aperio_url + '?GETANNOTATIONS';

    //annotation
    //
    //  attributes
    //
    //      attribute (name, value)
    //
    //  regions
    //
    //      region attribute headers
    //
    //          attribute header (id, name, columnwidth)
    //
    //      region (id, type, zoom, selected, location, focus area, length etc)
    //
    //          attributes
    //
    //              attribute (name, value)
    //
    //          vertices
    //
    //              vertex (x, y)
    //
    //  inputannotationid


    function parseSingleAnnotation(annotationXML) {

        var returnobj = {}

        //  <Annotation Id="2" Name="Report Image" ReadOnly="0" NameReadOnly="0" LineColorReadOnly="0"
        //  Incremental="0" Type="8" LineColor="65535" Visible="1" Selected="1" MarkupImagePath="" MacroName="">
        var annotation_attributes = annotationXML.attributes; // obvious.
        var annotation_properties = {}
        for (var j = 0; j < annotation_attributes.length; j++) {
            var at = annotation_attributes[j];
            var nm = at.name;
            annotation_properties[nm] = at.value
        }

        // annotation (global) attributes
        var global_attributes = $(annotationXML)
            .find('Attributes')
            .filter(function() {
                return $(this).parent()[0].tagName === "Annotation";
            });

        var global_properties = []
        global_attributes.each(function(n, attribs) {
            $(attribs).children().each(function(i, val) {
                var prop = {}
                for (var j = 0; j < val.attributes.length; j++) {
                    var at = val.attributes[j];
                    var nm = at.name;
                    prop[nm] = at.value
                }
                global_properties.push(prop);
            })
        });

        // annotation (global) attributes
        var region_header_attributes = $(annotationXML)
            .find('AttributeHeader')
            .filter(function() {
                return $(this).parent()[0].tagName === "RegionAttributeHeaders";
            });

        var region_header_properties = [];
        region_header_attributes.each(function(n, attribs) {
            var prop = {}
            for (var j = 0; j < attribs.attributes.length; j++) {
                var at = attribs.attributes[j];
                var nm = at.name;
                prop[nm] = at.value
            }
            region_header_properties.push(prop);
        });

        var regions = []

        var regionXML = $(annotationXML).find("Region")
        regionXML.each(function(n, region) {
            var region_properties = []
            for (var j = 0; j < region.attributes.length; j++) {
                var at = region.attributes[j];
                var nm = at.name;
                region_properties[nm] = at.value
            }

            // annotation (global) attributes
            var region_attributes = $(region)
                .find('Attributes')

            var region_attribute_properties = [];
            region_attributes.children().each(function(n, attribs) {
                var prop = {}
                for (var j = 0; j < attribs.attributes.length; j++) {
                    var at = attribs.attributes[j];
                    var nm = at.name;
                    prop[nm] = at.value;
                }
                region_attribute_properties.push(prop);
            });

            var region_vertices = $(region).find('Vertex');
            var vertex_list = [];
            region_vertices.each(function(n, vert) {
                var x = parseInt(vert.attributes['X'].nodeValue);
                var y = -1 * parseInt(vert.attributes['Y'].nodeValue);
                vertex_list.push([x, y]);
            })


            var region_data = {
                properties: region_properties,
                attributes: region_attribute_properties,
                vertices: vertex_list
            }

            regions.push(region_data);

        });


        returnobj = {
            GlobalAttributes: global_properties,
            AnnotationProperties: annotation_properties,
            RegionAttributeHeaders: region_header_properties,
            Regions: regions
        }

        console.log(returnobj);

        // let's create a feature

        if (returnobj.Regions.length > 0) {

            for (var i in returnobj.Regions) {

                var current_region = returnobj.Regions[i];

                var feature = new ol.Feature({
                    layer: returnobj.AnnotationProperties.Name,
                    title: i,
                    aperio: returnobj
                });

                var lineColorFlip = decimalToHex(returnobj.AnnotationProperties.LineColor, 6);
                var lineColor = lineColorFlip[4] + lineColorFlip[5] + lineColorFlip[2] + lineColorFlip[3] + lineColorFlip[0] + lineColorFlip[1];
                lineColor = "#" + lineColor;

                feature.set('hexcolor', lineColor);

                console.log(current_region.vertices);

                feature.setGeometry(new ol.geom.Polygon([current_region.vertices]));

                vector_source.addFeatures([feature]);

            }
        }
    }


    function parseAperioXML(aperio_xml) {
        var annotationList = $(aperio_xml).find('Annotation');
        $(annotationList).each(function(index, annotation) {
            parseSingleAnnotation(annotation);
        });
    }

    $.ajax({
        url: annotation_url,
        dataType: "xml",
        success: function(data) {

            parseAperioXML(data);
        }
    });

}


function createViewer(metadata) {

    var imageCenter = [metadata.max_size.w / 2, -metadata.max_size.h / 2];

    var projection = new ol.proj.Projection({
        code: 'ZOOMIFY',
        units: 'pixels',
        extent: [0, 0, metadata.max_size.w, metadata.max_size.h]
    });

    console.log(metadata);

    var crossOrigin = 'anonymous';
    var image_source = new ol.source.Leica({
        url: metadata.url,
        size: [metadata.max_size.w, metadata.max_size.h],
        crossOrigin: crossOrigin
    });


    vector_source = new ol.source.Vector();
    vector_layer = new ol.layer.Vector({
        source: vector_source,
        style: styleFunction
    });


    // initialize the new layer on top
    image_layer = new ol.layer.Tile({
        source: image_source,
        preload: 1
    });

    var mainView = new ol.View({
        projection: projection,
        center: imageCenter,
        zoom: 1,
        maxZoom: metadata.num_resolutions
    });

    map = createMap('map', mainView, false);

    map.addLayer(image_layer);
    map.setView(mainView);

    var overviewView = new ol.control.OverviewMap({
        maximized: true,
        minRatio: 0.25
    });

    map.addControl(overviewView);

    var scaleLineControl = new ol.control.ScaleLine({
        units: 'pixels'
    });
    map.addControl(scaleLineControl);

    addAperioAnnotation(metadata.url);

    map.addLayer(vector_layer)

}

loadLeicaImage(example_leica_image)
